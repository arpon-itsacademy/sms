<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Services\SmsService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamResultSmsController extends Controller
{
    public const DEFAULT_TEMPLATE = "Dear {student_name}, your result for {exam_name} ({subject}): Marks: {obtained_marks}/{total_marks}, Highest: {highest_marks}, Merit Position: {merit_position} in {batch_name}. {institution_name}";

    public function __construct(
        protected SmsService $smsService
    ) {}

    /**
     * Get saved exam result SMS template.
     */
    public function getTemplates(): JsonResponse
    {
        $raw = DB::table('settings')->where('key', 'sms_template_exam_result')->value('value');
        $template = $raw ? json_decode($raw, true) : null;

        return response()->json([
            'exam_result' => $template ?: self::DEFAULT_TEMPLATE,
            'default_template' => self::DEFAULT_TEMPLATE,
        ]);
    }

    /**
     * Save customized exam result SMS template.
     */
    public function updateTemplates(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exam_result' => 'required|string|min:5|max:1000',
        ]);

        DB::table('settings')->updateOrInsert(
            ['key' => 'sms_template_exam_result'],
            [
                'value' => json_encode($validated['exam_result'], JSON_THROW_ON_ERROR),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'SMS template saved successfully.',
            'exam_result' => $validated['exam_result'],
        ]);
    }

    /**
     * Preview exam result messages and recipient stats.
     */
    public function preview(Request $request, Exam $exam): JsonResponse
    {
        $validated = $request->validate([
            'batch_id' => 'nullable|integer|exists:batches,id',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'in:student,father,mother',
            'custom_template' => 'nullable|string|max:1000',
        ]);

        $template = ! empty($validated['custom_template'])
            ? $validated['custom_template']
            : $this->getSavedTemplate();

        $prepared = $this->prepareExamResultData($exam, $validated['batch_id'] ?? null, $validated['recipients'], $template);

        return response()->json($prepared);
    }

    /**
     * Send exam results via SMS to selected recipients.
     */
    public function send(Request $request, Exam $exam): JsonResponse
    {
        $validated = $request->validate([
            'batch_id' => 'nullable|integer|exists:batches,id',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'in:student,father,mother',
            'custom_template' => 'nullable|string|max:1000',
        ]);

        $settings = $this->smsService->getSettings();
        if (! $settings['is_configured']) {
            return response()->json([
                'success' => false,
                'message' => 'BulkSMSBD is not configured. Please enter your API Key and Sender ID in BulkSMSBD Config.',
            ], 422);
        }

        $template = ! empty($validated['custom_template'])
            ? $validated['custom_template']
            : $this->getSavedTemplate();

        $prepared = $this->prepareExamResultData($exam, $validated['batch_id'] ?? null, $validated['recipients'], $template);

        if (empty($prepared['items'])) {
            return response()->json([
                'success' => false,
                'message' => 'No student results found for this exam.',
            ], 422);
        }

        $sentCount = 0;
        $failedCount = 0;
        $errors = [];

        foreach ($prepared['items'] as $item) {
            $phones = $item['phones'];
            if (empty($phones)) {
                continue;
            }

            try {
                $res = $this->smsService->send($phones, $item['message']);
                if ($res['success']) {
                    $sentCount += count($phones);
                } else {
                    $failedCount += count($phones);
                    $errors[] = "{$item['student_name']}: " . ($res['message'] ?? 'Failed to send');
                }
            } catch (Exception $e) {
                $failedCount += count($phones);
                $errors[] = "{$item['student_name']}: " . $e->getMessage();
            }
        }

        Log::info('Exam Result SMS execution finished', [
            'exam_id' => $exam->id,
            'sent' => $sentCount,
            'failed' => $failedCount,
        ]);

        return response()->json([
            'success' => $sentCount > 0,
            'total_students' => count($prepared['items']),
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
            'errors' => array_slice($errors, 0, 5),
            'message' => $sentCount > 0
                ? "Successfully sent result SMS to {$sentCount} recipient(s)." . ($failedCount > 0 ? " ({$failedCount} failed)" : '')
                : 'Failed to send result SMS: ' . implode('; ', array_slice($errors, 0, 2)),
        ]);
    }

    /**
     * Prepare student result messages with dynamic tags, merit position and highest score.
     */
    protected function prepareExamResultData(Exam $exam, ?int $batchId, array $recipientTypes, string $template): array
    {
        $exam->loadMissing('batches');

        $query = ExamResult::with(['student.batches' => function ($q) {
            $q->whereNull('batch_student.ended_at');
        }])->where('exam_id', $exam->id);

        if ($batchId) {
            $query->whereIn('student_id', function ($sub) use ($batchId, $exam): void {
                $sub->select('student_id')->from('batch_student')
                    ->where('batch_id', $batchId)
                    ->where('assigned_at', '<=', $exam->exam_date->endOfDay())
                    ->where(fn ($q) => $q->whereNull('ended_at')->orWhere('ended_at', '>=', $exam->exam_date->startOfDay()));
            });
        }

        $results = $query->get();

        // Calculate highest mark (among present students)
        $presentResults = $results->filter(fn ($r) => ! $r->is_absent && $r->obtained_marks !== null);
        $highestMark = $presentResults->max('obtained_marks');
        $highestMarkStr = $highestMark !== null ? (string) (float) $highestMark : '—';

        // Calculate merit ranks
        $sorted = $presentResults->sortByDesc('obtained_marks')->values();
        $ranks = [];
        $currentRank = 1;
        $prevMark = null;
        foreach ($sorted as $idx => $res) {
            if ($prevMark !== null && $res->obtained_marks < $prevMark) {
                $currentRank = $idx + 1;
            }
            $ranks[$res->student_id] = $currentRank;
            $prevMark = $res->obtained_marks;
        }

        $institutionName = DB::table('settings')->where('key', 'institution_name')->value('value');
        $institutionName = $institutionName ? json_decode($institutionName, true) : 'Coaching Manager';

        $items = [];
        $samples = [];
        $totalRecipients = 0;
        $uniqueNumbers = [];

        foreach ($results as $result) {
            $student = $result->student;
            if (! $student) {
                continue;
            }

            // Student batch name
            $batchNames = $exam->batches->pluck('name')->join(', ');
            if (empty($batchNames)) {
                $batchNames = $student->batches->pluck('name')->join(', ');
            }

            // Student rank
            $rankNumber = $ranks[$student->id] ?? null;
            $meritPos = $result->is_absent
                ? 'Absent'
                : ($rankNumber ? $this->ordinal($rankNumber) : 'N/A');

            $obtainedStr = $result->is_absent
                ? 'Absent'
                : ($result->obtained_marks !== null ? (string) (float) $result->obtained_marks : '0');

            $replacements = [
                '{student_name}' => $student->name,
                '{name}' => $student->name,
                '{father_name}' => $student->father_name ?? '',
                '{mother_name}' => $student->mother_name ?? '',
                '{school_name}' => $student->school_name ?? '',
                '{school}' => $student->school_name ?? '',
                '{roll_number}' => $student->roll_number ?? '',
                '{roll}' => $student->roll_number ?? '',
                '{exam_name}' => $exam->title,
                '{exam}' => $exam->title,
                '{subject}' => $exam->subject ?? 'General',
                '{total_marks}' => (string) (float) $exam->total_marks,
                '{obtained_marks}' => $obtainedStr,
                '{marks}' => $obtainedStr,
                '{highest_marks}' => $highestMarkStr,
                '{highest_mark}' => $highestMarkStr,
                '{merit_position}' => $meritPos,
                '{position}' => $meritPos,
                '{rank}' => $meritPos,
                '{batch_name}' => $batchNames ?: 'Class',
                '{batch}' => $batchNames ?: 'Class',
                '{institution_name}' => $institutionName,
            ];

            $renderedMessage = str_ireplace(array_keys($replacements), array_values($replacements), $template);

            // Extract phones
            $phones = [];
            $destinations = [];

            if (in_array('student', $recipientTypes, true) && ! empty($student->phone)) {
                $clean = $this->cleanPhoneNumber($student->phone);
                if ($clean) {
                    $phones[] = $clean;
                    $destinations[] = ['type' => 'Student', 'phone' => $clean];
                    $uniqueNumbers[$clean] = true;
                    $totalRecipients++;
                }
            }

            if (in_array('father', $recipientTypes, true) && ! empty($student->father_phone)) {
                $clean = $this->cleanPhoneNumber($student->father_phone);
                if ($clean) {
                    $phones[] = $clean;
                    $destinations[] = ['type' => 'Father', 'phone' => $clean];
                    $uniqueNumbers[$clean] = true;
                    $totalRecipients++;
                }
            }

            if (in_array('mother', $recipientTypes, true) && ! empty($student->mother_phone)) {
                $clean = $this->cleanPhoneNumber($student->mother_phone);
                if ($clean) {
                    $phones[] = $clean;
                    $destinations[] = ['type' => 'Mother', 'phone' => $clean];
                    $uniqueNumbers[$clean] = true;
                    $totalRecipients++;
                }
            }

            $phones = array_values(array_unique($phones));

            $itemData = [
                'student_id' => $student->id,
                'student_name' => $student->name,
                'roll_number' => $student->roll_number,
                'obtained_marks' => $obtainedStr,
                'merit_position' => $meritPos,
                'phones' => $phones,
                'destinations' => $destinations,
                'message' => $renderedMessage,
                'char_count' => mb_strlen($renderedMessage, 'UTF-8'),
            ];

            $items[] = $itemData;

            if (count($samples) < 5 && ! empty($phones)) {
                $samples[] = $itemData;
            }
        }

        $isUnicode = strlen($template) !== mb_strlen($template, 'UTF-8');

        return [
            'exam' => [
                'id' => $exam->id,
                'title' => $exam->title,
                'subject' => $exam->subject,
                'total_marks' => (float) $exam->total_marks,
                'highest_marks' => $highestMarkStr,
            ],
            'total_students' => count($items),
            'total_recipients' => $totalRecipients,
            'unique_phone_count' => count($uniqueNumbers),
            'is_unicode' => $isUnicode,
            'samples' => $samples,
            'items' => $items,
        ];
    }

    protected function getSavedTemplate(): string
    {
        $raw = DB::table('settings')->where('key', 'sms_template_exam_result')->value('value');
        $val = $raw ? json_decode($raw, true) : null;

        return $val ?: self::DEFAULT_TEMPLATE;
    }

    protected function ordinal(int $number): string
    {
        $ends = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
        if ((($number % 100) >= 11) && (($number % 100) <= 13)) {
            return $number . 'th';
        }

        return $number . $ends[$number % 10];
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
