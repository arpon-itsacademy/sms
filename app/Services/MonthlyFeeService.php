<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\MonthlyFee;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class MonthlyFeeService
{
    public function generateForMonth(CarbonImmutable $month): int
    {
        $start = $month->startOfMonth();
        $end = $month->endOfMonth();
        $created = 0;

        Batch::query()
            ->where('monthly_fee', '>', 0)
            ->where(fn ($query) => $query->whereNull('start_date')->orWhereDate('start_date', '<=', $end->toDateString()))
            ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', $start->toDateString()))
            ->orderBy('id')
            ->chunkById(100, function ($batches) use ($start, $end, &$created): void {
                foreach ($batches as $batch) {
                    $enrollments = DB::table('batch_student')
                        ->where('batch_id', $batch->id)
                        ->whereDate('assigned_at', '<=', $end->toDateString())
                        ->where(fn ($query) => $query->whereNull('ended_at')->orWhereDate('ended_at', '>=', $start->toDateString()))
                        ->get(['student_id']);

                    foreach ($enrollments as $enrollment) {
                        $created += MonthlyFee::query()->insertOrIgnore([
                            'student_id' => $enrollment->student_id,
                            'batch_id' => $batch->id,
                            'billing_month' => $start->toDateString(),
                            'amount' => $batch->monthly_fee,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            });

        return $created;
    }

    public function generateCurrentMonth(): int
    {
        return $this->generateForMonth(CarbonImmutable::now(config('app.timezone')));
    }

    public function balance(MonthlyFee $fee): float
    {
        return max(0, round((float) $fee->amount - (float) $fee->payments()->sum('amount'), 2));
    }

    public function status(MonthlyFee $fee): string
    {
        $paid = (float) $fee->payments()->sum('amount');

        if ($paid <= 0) {
            return 'unpaid';
        }

        return $paid >= (float) $fee->amount ? 'paid' : 'partial';
    }
}
