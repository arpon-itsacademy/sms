<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Student;
use App\Services\SmsService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BulkSmsController extends Controller
{
    public function __construct(
        protected SmsService $smsService
    ) {}

    /**
     * Preview bulk SMS recipients and sample rendered messages.
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_type' => 'required|in:all,batch',
            'batch_ids' => 'required_if:target_type,batch|array',
            'batch_ids.*' => 'integer|exists:batches,id',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'in:student,father,mother',
            'message' => 'required|string|min:1|max:1000',
        ]);

        $students = $this->getTargetStudents($validated['target_type'], $validated['batch_ids'] ?? []);
        $rawMessage = $validated['message'];
        $recipientTypes = $validated['recipients'];

        $totalRecipients = 0;
        $uniqueNumbers = [];
        $samples = [];

        foreach ($students as $student) {
            $studentMsg = $this->renderMessage($rawMessage, $student);
            $studentNumbers = $this->extractStudentNumbers($student, $recipientTypes);

            foreach ($studentNumbers as $item) {
                $uniqueNumbers[$item['phone']] = true;
                $totalRecipients++;

                if (count($samples) < 5) {
                    $samples[] = [
                        'student_id' => $student->id,
                        'student_name' => $student->name,
                        'school_name' => $student->school_name,
                        'batch_names' => $student->batches->pluck('name')->join(', '),
                        'recipient_type' => $item['type'],
                        'recipient_name' => $item['name'],
                        'phone' => $item['phone'],
                        'message' => $studentMsg,
                        'char_count' => mb_strlen($studentMsg, 'UTF-8'),
                    ];
                }
            }
        }

        $isUnicode = strlen($rawMessage) !== mb_strlen($rawMessage, 'UTF-8');
        $sampleCharCount = count($samples) > 0 ? $samples[0]['char_count'] : mb_strlen($rawMessage, 'UTF-8');
        $smsParts = $this->calculateSmsParts($sampleCharCount, $isUnicode);

        return response()->json([
            'total_students' => $students->count(),
            'total_recipients' => $totalRecipients,
            'unique_phone_count' => count($uniqueNumbers),
            'is_unicode' => $isUnicode,
            'sms_parts' => $smsParts,
            'samples' => $samples,
        ]);
    }

    /**
     * Send bulk SMS to targeted students and/or parents.
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_type' => 'required|in:all,batch',
            'batch_ids' => 'required_if:target_type,batch|array',
            'batch_ids.*' => 'integer|exists:batches,id',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'in:student,father,mother',
            'message' => 'required|string|min:1|max:1000',
        ]);

        $settings = $this->smsService->getSettings();
        if (! $settings['is_configured']) {
            return response()->json([
                'success' => false,
                'message' => 'BulkSMSBD is not configured. Please enter your API Key and Sender ID in BulkSMSBD Config.',
            ], 422);
        }

        $students = $this->getTargetStudents($validated['target_type'], $validated['batch_ids'] ?? []);
        if ($students->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No active students found for the selected audience.',
            ], 422);
        }

        $rawMessage = $validated['message'];
        $recipientTypes = $validated['recipients'];
        $hasDynamicTags = $this->hasDynamicTags($rawMessage);

        $sentCount = 0;
        $failedCount = 0;
        $errors = [];

        if (! $hasDynamicTags) {
            // Static message: batch numbers together (up to 100 per API call) for highest speed
            $allNumbers = [];
            foreach ($students as $student) {
                $items = $this->extractStudentNumbers($student, $recipientTypes);
                foreach ($items as $item) {
                    $allNumbers[$item['phone']] = true;
                }
            }

            $numberList = array_keys($allNumbers);
            if (empty($numberList)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid phone numbers found for the selected students.',
                ], 422);
            }

            $chunks = array_chunk($numberList, 100);
            foreach ($chunks as $chunk) {
                $res = $this->smsService->send($chunk, $rawMessage);
                if ($res['success']) {
                    $sentCount += count($chunk);
                } else {
                    $failedCount += count($chunk);
                    $errors[] = $res['message'] ?? 'Gateway dispatch error';
                }
            }
        } else {
            // Personalized message per student:
            // Send each student's personalized message to their selected recipient numbers
            foreach ($students as $student) {
                $studentNumbers = $this->extractStudentNumbers($student, $recipientTypes);
                if (empty($studentNumbers)) {
                    continue;
                }

                $phones = array_unique(array_column($studentNumbers, 'phone'));
                $studentMsg = $this->renderMessage($rawMessage, $student);

                try {
                    $res = $this->smsService->send($phones, $studentMsg);
                    if ($res['success']) {
                        $sentCount += count($phones);
                    } else {
                        $failedCount += count($phones);
                        $errors[] = "Student {$student->name}: " . ($res['message'] ?? 'Failed to send');
                    }
                } catch (Exception $e) {
                    $failedCount += count($phones);
                    $errors[] = "Student {$student->name}: " . $e->getMessage();
                }
            }
        }

        Log::info('Bulk SMS execution finished', [
            'sent' => $sentCount,
            'failed' => $failedCount,
            'target_type' => $validated['target_type'],
        ]);

        return response()->json([
            'success' => $sentCount > 0,
            'total_students' => $students->count(),
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
            'errors' => array_slice($errors, 0, 5),
            'message' => $sentCount > 0
                ? "Successfully sent SMS to {$sentCount} recipient(s)." . ($failedCount > 0 ? " ({$failedCount} failed)" : '')
                : 'Failed to send SMS to any recipients: ' . implode('; ', array_slice($errors, 0, 2)),
        ]);
    }

    /**
     * Get active students based on target criteria.
     */
    protected function getTargetStudents(string $targetType, array $batchIds)
    {
        $query = Student::query()
            ->with(['batches' => function ($q) {
                $q->whereNull('batch_student.ended_at');
            }])
            ->where('status', 'active');

        if ($targetType === 'batch' && ! empty($batchIds)) {
            $query->whereHas('batches', function ($q) use ($batchIds) {
                $q->whereIn('batches.id', $batchIds)
                  ->whereNull('batch_student.ended_at');
            });
        }

        return $query->get();
    }

    /**
     * Extract recipient numbers from student based on types.
     */
    protected function extractStudentNumbers(Student $student, array $types): array
    {
        $numbers = [];

        if (in_array('student', $types, true) && ! empty($student->phone)) {
            $clean = $this->cleanPhoneNumber($student->phone);
            if ($clean) {
                $numbers[] = [
                    'type' => 'Student',
                    'name' => $student->name,
                    'phone' => $clean,
                ];
            }
        }

        if (in_array('father', $types, true) && ! empty($student->father_phone)) {
            $clean = $this->cleanPhoneNumber($student->father_phone);
            if ($clean) {
                $numbers[] = [
                    'type' => 'Father',
                    'name' => $student->father_name ?: ($student->name . ' (Father)'),
                    'phone' => $clean,
                ];
            }
        }

        if (in_array('mother', $types, true) && ! empty($student->mother_phone)) {
            $clean = $this->cleanPhoneNumber($student->mother_phone);
            if ($clean) {
                $numbers[] = [
                    'type' => 'Mother',
                    'name' => $student->mother_name ?: ($student->name . ' (Mother)'),
                    'phone' => $clean,
                ];
            }
        }

        return $numbers;
    }

    /**
     * Clean and format Bangladeshi phone numbers.
     */
    protected function cleanPhoneNumber(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($cleaned) < 10) {
            return null;
        }

        // Convert 8801XXXXXXXXX to 01XXXXXXXXX if necessary or keep 11 digits
        if (str_starts_with($cleaned, '880') && strlen($cleaned) === 13) {
            $cleaned = substr($cleaned, 2);
        }

        return $cleaned;
    }

    /**
     * Check if message has dynamic tags.
     */
    protected function hasDynamicTags(string $message): bool
    {
        $tags = [
            '{student_name}', '{name}',
            '{batch_name}', '{batch}',
            '{father_name}',
            '{mother_name}',
            '{school_name}', '{school}',
            '{roll_number}', '{roll}',
        ];

        foreach ($tags as $tag) {
            if (stripos($message, $tag) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Replace dynamic tags with student values.
     */
    protected function renderMessage(string $template, Student $student): string
    {
        $batchNames = $student->batches->pluck('name')->join(', ');

        $replacements = [
            '{student_name}' => $student->name ?? '',
            '{name}' => $student->name ?? '',
            '{batch_name}' => $batchNames ?: 'Class',
            '{batch}' => $batchNames ?: 'Class',
            '{father_name}' => $student->father_name ?? '',
            '{mother_name}' => $student->mother_name ?? '',
            '{school_name}' => $student->school_name ?? '',
            '{school}' => $student->school_name ?? '',
            '{roll_number}' => $student->roll_number ?? '',
            '{roll}' => $student->roll_number ?? '',
        ];

        return str_ireplace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Calculate SMS parts based on character length and encoding.
     */
    protected function calculateSmsParts(int $charCount, bool $isUnicode): int
    {
        if ($charCount === 0) {
            return 1;
        }

        if ($isUnicode) {
            return $charCount <= 70 ? 1 : (int) ceil($charCount / 67);
        }

        return $charCount <= 160 ? 1 : (int) ceil($charCount / 153);
    }
}
