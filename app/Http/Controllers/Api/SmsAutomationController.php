<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\FeePayment;
use App\Models\MonthlyFee;
use App\Models\Student;
use App\Services\SmsService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SmsAutomationController extends Controller
{
    public const DEFAULT_ABSENT_TEMPLATE = "Dear Guardian, your ward {student_name} (Roll: {roll_number}) was marked ABSENT on {date} for batch {batch_name}. {institution_name}";
    public const DEFAULT_FEE_TEMPLATE = "Dear {student_name}, payment of Tk {amount} received for {month} {year}. Balance Due: Tk {due_amount}. Trx: {trx_id}. Thank you. {institution_name}";

    public function __construct(
        protected SmsService $smsService
    ) {}

    /**
     * Get automated SMS rules and settings.
     */
    public function getSettings(): JsonResponse
    {
        $raw = DB::table('settings')->where('key', 'sms_automation')->value('value');
        $stored = $raw ? json_decode($raw, true) : [];

        $settings = [
            'absent_sms_enabled' => (bool) ($stored['absent_sms_enabled'] ?? false),
            'absent_recipients' => $stored['absent_recipients'] ?? ['father', 'mother'],
            'absent_template' => $stored['absent_template'] ?? self::DEFAULT_ABSENT_TEMPLATE,
            'default_absent_template' => self::DEFAULT_ABSENT_TEMPLATE,

            'fee_sms_enabled' => (bool) ($stored['fee_sms_enabled'] ?? false),
            'fee_recipients' => $stored['fee_recipients'] ?? ['student', 'father'],
            'fee_template' => $stored['fee_template'] ?? self::DEFAULT_FEE_TEMPLATE,
            'default_fee_template' => self::DEFAULT_FEE_TEMPLATE,
        ];

        return response()->json([
            'settings' => $settings,
        ]);
    }

    /**
     * Update automated SMS rules and settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'absent_sms_enabled' => 'required|boolean',
            'absent_recipients' => 'required|array|min:1',
            'absent_recipients.*' => 'in:student,father,mother',
            'absent_template' => 'required|string|min:5|max:1000',

            'fee_sms_enabled' => 'required|boolean',
            'fee_recipients' => 'required|array|min:1',
            'fee_recipients.*' => 'in:student,father,mother',
            'fee_template' => 'required|string|min:5|max:1000',
        ]);

        DB::table('settings')->updateOrInsert(
            ['key' => 'sms_automation'],
            [
                'value' => json_encode($validated, JSON_THROW_ON_ERROR),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'SMS Automation settings saved successfully.',
            'settings' => $validated,
        ]);
    }

    /**
     * Dispatch automated SMS for students marked absent in an attendance session.
     */
    public function dispatchAbsentAlerts(AttendanceSession $session, array $records): void
    {
        $raw = DB::table('settings')->where('key', 'sms_automation')->value('value');
        $settings = $raw ? json_decode($raw, true) : null;

        if (empty($settings['absent_sms_enabled'])) {
            return;
        }

        $gateway = $this->smsService->getSettings();
        if (! $gateway['is_configured']) {
            Log::info('Absent SMS skipped: BulkSMSBD is not configured.');
            return;
        }

        $absentRecords = collect($records)->filter(fn ($r) => ($r['status'] ?? null) === 'absent');
        if ($absentRecords->isEmpty()) {
            return;
        }

        $studentIds = $absentRecords->pluck('student_id')->unique()->all();
        $students = Student::whereIn('id', $studentIds)->get()->keyBy('id');

        $session->loadMissing('batch');
        $batchName = $session->batch ? $session->batch->name : 'Regular Class';
        $sessionDate = $session->session_date ? $session->session_date->format('d M Y') : date('d M Y');

        $institutionName = DB::table('settings')->where('key', 'institution_name')->value('value');
        $institutionName = $institutionName ? json_decode($institutionName, true) : 'Coaching Manager';

        $template = $settings['absent_template'] ?? self::DEFAULT_ABSENT_TEMPLATE;
        $recipientTypes = $settings['absent_recipients'] ?? ['father', 'mother'];

        foreach ($studentIds as $sId) {
            $student = $students->get($sId);
            if (! $student) {
                continue;
            }

            $phones = $this->resolveRecipientPhones($student, $recipientTypes);
            if (empty($phones)) {
                continue;
            }

            $replacements = [
                '{student_name}' => $student->name,
                '{name}' => $student->name,
                '{roll_number}' => $student->roll_number ?? '',
                '{roll}' => $student->roll_number ?? '',
                '{father_name}' => $student->father_name ?? '',
                '{mother_name}' => $student->mother_name ?? '',
                '{date}' => $sessionDate,
                '{batch_name}' => $batchName,
                '{batch}' => $batchName,
                '{institution_name}' => $institutionName,
            ];

            $message = str_ireplace(array_keys($replacements), array_values($replacements), $template);

            try {
                $this->smsService->send($phones, $message);
                Log::info("Automated Absent SMS sent to student {$student->id}", ['phones' => $phones]);
            } catch (Exception $e) {
                Log::warning("Automated Absent SMS failed for student {$student->id}: " . $e->getMessage());
            }
        }
    }

    /**
     * Dispatch automated SMS for a fee payment.
     */
    public function dispatchFeeAlert(FeePayment $payment, MonthlyFee $monthlyFee): void
    {
        $raw = DB::table('settings')->where('key', 'sms_automation')->value('value');
        $settings = $raw ? json_decode($raw, true) : null;

        if (empty($settings['fee_sms_enabled'])) {
            return;
        }

        $gateway = $this->smsService->getSettings();
        if (! $gateway['is_configured']) {
            Log::info('Fee Payment SMS skipped: BulkSMSBD is not configured.');
            return;
        }

        $monthlyFee->loadMissing(['student', 'batch']);
        $student = $monthlyFee->student;
        if (! $student) {
            return;
        }

        $recipientTypes = $settings['fee_recipients'] ?? ['student', 'father'];
        $phones = $this->resolveRecipientPhones($student, $recipientTypes);
        if (empty($phones)) {
            return;
        }

        $totalPaid = (float) $monthlyFee->payments()->sum('amount');
        $dueAmount = max(0, (float) $monthlyFee->amount - $totalPaid);
        $dueFormatted = number_format($dueAmount, 2);
        $paidFormatted = number_format((float) $payment->amount, 2);

        $institutionName = DB::table('settings')->where('key', 'institution_name')->value('value');
        $institutionName = $institutionName ? json_decode($institutionName, true) : 'Coaching Manager';

        $batchName = $monthlyFee->batch ? $monthlyFee->batch->name : 'Coaching';
        $monthName = date('F', mktime(0, 0, 0, $monthlyFee->month, 10));
        $trxId = $payment->reference ?: ('TRX-' . str_pad($payment->id, 5, '0', STR_PAD_LEFT));

        $template = $settings['fee_template'] ?? self::DEFAULT_FEE_TEMPLATE;

        $replacements = [
            '{student_name}' => $student->name,
            '{name}' => $student->name,
            '{roll_number}' => $student->roll_number ?? '',
            '{roll}' => $student->roll_number ?? '',
            '{father_name}' => $student->father_name ?? '',
            '{mother_name}' => $student->mother_name ?? '',
            '{amount}' => $paidFormatted,
            '{month}' => $monthName,
            '{year}' => (string) $monthlyFee->year,
            '{due_amount}' => $dueFormatted,
            '{balance}' => $dueFormatted,
            '{trx_id}' => $trxId,
            '{batch_name}' => $batchName,
            '{batch}' => $batchName,
            '{institution_name}' => $institutionName,
        ];

        $message = str_ireplace(array_keys($replacements), array_values($replacements), $template);

        try {
            $this->smsService->send($phones, $message);
            Log::info("Automated Fee SMS sent for student {$student->id}, payment {$payment->id}", ['phones' => $phones]);
        } catch (Exception $e) {
            Log::warning("Automated Fee SMS failed for payment {$payment->id}: " . $e->getMessage());
        }
    }

    protected function resolveRecipientPhones(Student $student, array $recipientTypes): array
    {
        $phones = [];
        if (in_array('student', $recipientTypes, true) && ! empty($student->phone)) {
            $clean = $this->cleanPhoneNumber($student->phone);
            if ($clean) $phones[] = $clean;
        }
        if (in_array('father', $recipientTypes, true) && ! empty($student->father_phone)) {
            $clean = $this->cleanPhoneNumber($student->father_phone);
            if ($clean) $phones[] = $clean;
        }
        if (in_array('mother', $recipientTypes, true) && ! empty($student->mother_phone)) {
            $clean = $this->cleanPhoneNumber($student->mother_phone);
            if ($clean) $phones[] = $clean;
        }
        return array_values(array_unique($phones));
    }

    protected function cleanPhoneNumber(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($cleaned) < 10) {
            return null;
        }
        if (str_starts_with($cleaned, '880') && strlen($cleaned) === 13) {
            $cleaned = substr($cleaned, 2);
        }
        return $cleaned;
    }
}
