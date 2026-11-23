<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\FeePayment;
use App\Models\MonthlyFee;
use App\Services\MonthlyFeeService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FeeController extends Controller
{
    public function __construct(private readonly MonthlyFeeService $fees) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'batch_id' => ['nullable', 'integer', 'exists:batches,id'],
            'status' => ['nullable', 'in:unpaid,partial,paid'],
            'q' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $month = CarbonImmutable::createFromFormat(
            '!Y-m',
            $filters['month'] ?? now(config('app.timezone'))->format('Y-m'),
            config('app.timezone')
        );

        if ($month->format('Y-m') === now(config('app.timezone'))->format('Y-m')) {
            $this->fees->generateForMonth($month);
        }

        $query = $this->invoiceQuery()
            ->whereDate('monthly_fees.billing_month', $month->startOfMonth()->toDateString());
        $query->when(isset($filters['batch_id']), fn (Builder $builder) => $builder->where('monthly_fees.batch_id', $filters['batch_id']));
        $query->when(isset($filters['q']), fn (Builder $builder) => $builder->where(fn (Builder $search) => $search
            ->where('students.name', 'like', '%'.$filters['q'].'%')
            ->orWhere('students.roll_number', 'like', '%'.$filters['q'].'%')
            ->orWhere('batches.name', 'like', '%'.$filters['q'].'%')));
        $query->when(isset($filters['status']), fn (Builder $builder) => $this->applyStatusFilter($builder, $filters['status']));

        $summaryQuery = clone $query;
        $summaryBuilder = $summaryQuery->toBase();
        $summaryBuilder->columns = null;
        $summary = $summaryBuilder
            ->selectRaw('COUNT(*) as invoice_count, COALESCE(SUM(monthly_fees.amount), 0) as total_due, COALESCE(SUM(payment_totals.paid_amount), 0) as total_paid')
            ->first();
        $invoices = $query->orderBy('batches.name')->orderBy('students.name')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => $invoices->through(fn (MonthlyFee $invoice) => $this->invoiceData($invoice)),
            'summary' => [
                'invoice_count' => (int) $summary->invoice_count,
                'total_due' => (float) $summary->total_due,
                'total_paid' => (float) $summary->total_paid,
                'outstanding' => round((float) $summary->total_due - (float) $summary->total_paid, 2),
            ],
        ]);
    }

    public function recordPayment(Request $request, MonthlyFee $monthlyFee): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:99999999.99'],
            'paid_at' => ['nullable', 'date', 'before_or_equal:now'],
            'method' => ['required', 'in:cash,bank,mobile_banking,other'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $payment = DB::transaction(function () use ($request, $monthlyFee, $data): FeePayment {
            $invoice = MonthlyFee::query()->lockForUpdate()->findOrFail($monthlyFee->id);
            $balance = $this->fees->balance($invoice);
            if ((float) $data['amount'] > $balance) {
                throw ValidationException::withMessages([
                    'amount' => 'The payment cannot exceed the remaining balance of '.number_format($balance, 2).'.',
                ]);
            }

            return $invoice->payments()->create([
                'amount' => $data['amount'],
                'paid_at' => $data['paid_at'] ?? now(config('app.timezone')),
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'received_by' => $request->user()->id,
            ]);
        });

        // Trigger automated fee payment SMS alert if enabled
        try {
            app(SmsAutomationController::class)->dispatchFeeAlert($payment, $monthlyFee->fresh());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Fee payment SMS dispatch error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Payment recorded.',
            'payment' => $payment->load('receiver:id,name'),
            'invoice' => $this->invoiceData($monthlyFee->fresh()->load(['student', 'batch'])->loadSum('payments', 'amount')),
        ], 201);
    }

    public function incomeSummary(Request $request): JsonResponse
    {
        $this->fees->generateCurrentMonth();

        $filters = $request->validate([
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'batch_id' => ['nullable', 'integer', 'exists:batches,id'],
        ]);
        $year = (int) ($filters['year'] ?? now(config('app.timezone'))->year);
        $batchId = $filters['batch_id'] ?? null;
        $payments = FeePayment::query()
            ->join('monthly_fees', 'monthly_fees.id', '=', 'fee_payments.monthly_fee_id')
            ->whereYear('fee_payments.paid_at', $year)
            ->when($batchId, fn (Builder $query) => $query->where('monthly_fees.batch_id', $batchId))
            ->selectRaw($this->monthExpression().' as income_month, COALESCE(SUM(fee_payments.amount), 0) as income')
            ->groupBy('income_month')
            ->orderBy('income_month')
            ->get()
            ->keyBy('income_month');

        $yearIncome = (float) $payments->sum(fn ($payment) => (float) $payment->income);
        $currentMonth = now(config('app.timezone'));
        $monthIncome = (float) FeePayment::query()
            ->join('monthly_fees', 'monthly_fees.id', '=', 'fee_payments.monthly_fee_id')
            ->whereBetween('fee_payments.paid_at', [
                $currentMonth->copy()->startOfMonth(),
                $currentMonth->copy()->endOfMonth(),
            ])
            ->when($batchId, fn (Builder $query) => $query->where('monthly_fees.batch_id', $batchId))
            ->sum('fee_payments.amount');
        $monthlyIncome = collect(range(1, 12))->map(function (int $month) use ($year, $payments): array {
            $key = sprintf('%04d-%02d', $year, $month);

            return [
                'month' => $key,
                'label' => CarbonImmutable::create($year, $month, 1)->format('M'),
                'income' => round((float) ($payments->get($key)?->income ?? 0), 2),
            ];
        });
        $outstanding = (float) DB::table('monthly_fees')
            ->leftJoinSub(
                FeePayment::query()->select('monthly_fee_id')->selectRaw('COALESCE(SUM(amount), 0) as paid_amount')->groupBy('monthly_fee_id'),
                'payment_totals',
                'payment_totals.monthly_fee_id',
                '=',
                'monthly_fees.id'
            )
            ->whereDate('monthly_fees.billing_month', '<=', now(config('app.timezone'))->startOfMonth()->toDateString())
            ->when($batchId, fn ($query) => $query->where('monthly_fees.batch_id', $batchId))
            ->selectRaw('COALESCE(SUM(CASE WHEN monthly_fees.amount > COALESCE(payment_totals.paid_amount, 0) THEN monthly_fees.amount - COALESCE(payment_totals.paid_amount, 0) ELSE 0 END), 0) as outstanding')
            ->value('outstanding');

        return response()->json([
            'year' => $year,
            'month_income' => round($monthIncome, 2),
            'year_income' => round($yearIncome, 2),
            'outstanding' => round($outstanding, 2),
            'monthly_income' => $monthlyIncome,
        ]);
    }

    private function invoiceQuery(): Builder
    {
        return MonthlyFee::query()
            ->join('students', 'students.id', '=', 'monthly_fees.student_id')
            ->join('batches', 'batches.id', '=', 'monthly_fees.batch_id')
            ->leftJoinSub(
                FeePayment::query()
                    ->select('monthly_fee_id')
                    ->selectRaw('COALESCE(SUM(amount), 0) as paid_amount')
                    ->groupBy('monthly_fee_id'),
                'payment_totals',
                'payment_totals.monthly_fee_id',
                '=',
                'monthly_fees.id'
            )
            ->with(['student', 'batch', 'payments.receiver:id,name'])
            ->withSum('payments', 'amount')
            ->select('monthly_fees.*')
            ->selectRaw('COALESCE(payment_totals.paid_amount, 0) as paid_amount');
    }

    private function applyStatusFilter(Builder $query, string $status): Builder
    {
        return match ($status) {
            'unpaid' => $query->whereRaw('COALESCE(payment_totals.paid_amount, 0) = 0'),
            'paid' => $query->whereRaw('COALESCE(payment_totals.paid_amount, 0) >= monthly_fees.amount'),
            'partial' => $query->whereRaw('COALESCE(payment_totals.paid_amount, 0) > 0 AND COALESCE(payment_totals.paid_amount, 0) < monthly_fees.amount'),
        };
    }

    private function invoiceData(MonthlyFee $invoice): array
    {
        $paid = (float) ($invoice->paid_amount ?? $invoice->payments_sum_amount ?? 0);
        $amount = (float) $invoice->amount;

        return [
            'id' => $invoice->id,
            'billing_month' => $invoice->billing_month->format('Y-m'),
            'student' => [
                'id' => $invoice->student->id,
                'name' => $invoice->student->name,
                'roll_number' => $invoice->student->roll_number,
                'phone' => $invoice->student->phone,
            ],
            'batch' => [
                'id' => $invoice->batch->id,
                'name' => $invoice->batch->name,
                'code' => $invoice->batch->code,
            ],
            'amount' => $amount,
            'paid_amount' => round($paid, 2),
            'balance' => round(max(0, $amount - $paid), 2),
            'status' => $paid <= 0 ? 'unpaid' : ($paid >= $amount ? 'paid' : 'partial'),
            'payments' => $invoice->relationLoaded('payments')
                ? $invoice->payments->map(fn (FeePayment $payment) => [
                    'id' => $payment->id,
                    'amount' => (float) $payment->amount,
                    'paid_at' => $payment->paid_at->toISOString(),
                    'method' => $payment->method,
                    'reference' => $payment->reference,
                    'received_by' => $payment->receiver?->name,
                ])
                : [],
        ];
    }

    private function monthExpression(): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', fee_payments.paid_at)"
            : "DATE_FORMAT(fee_payments.paid_at, '%Y-%m')";
    }
}
