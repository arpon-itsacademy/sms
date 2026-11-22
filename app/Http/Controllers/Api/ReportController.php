<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function students(Request $request): JsonResponse|StreamedResponse
    {
        $data = $request->validate([
            'batch_id' => ['nullable', 'integer', 'exists:batches,id'],
            'class_level' => ['nullable', 'string', 'max:100'],
            'school_name' => ['nullable', 'string', 'max:255'],
            'admitted_from' => ['nullable', 'date'],
            'admitted_to' => ['nullable', 'date', 'after_or_equal:admitted_from'],
            'export' => ['nullable', 'boolean'],
        ]);
        $query = Student::query();
        foreach (['class_level', 'school_name'] as $filter) {
            $query->when(isset($data[$filter]), fn ($builder) => $builder->where($filter, $data[$filter]));
        }
        $query->when(isset($data['batch_id']), fn ($builder) => $builder->whereHas('batches', fn ($relation) => $relation
            ->where('batches.id', $data['batch_id'])->whereNull('batch_student.ended_at')));
        $query->when(isset($data['admitted_from']), fn ($builder) => $builder->whereDate('admission_date', '>=', $data['admitted_from']));
        $query->when(isset($data['admitted_to']), fn ($builder) => $builder->whereDate('admission_date', '<=', $data['admitted_to']));

        if ($request->boolean('export')) {
            $students = $query->orderBy('name')->get();

            return response()->streamDownload(function () use ($students): void {
                $output = fopen('php://output', 'w');
                fputcsv($output, ['Roll', 'Name', 'School', 'Class', 'Phone', 'Father phone', 'Admission date', 'Status']);
                foreach ($students as $student) {
                    fputcsv($output, array_map($this->safeCsvValue(...), [
                        $student->roll_number,
                        $student->name,
                        $student->school_name,
                        $student->class_level,
                        $student->phone,
                        $student->father_phone,
                        $student->admission_date->toDateString(),
                        $student->status,
                    ]));
                }
                fclose($output);
            }, 'students.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        return response()->json(['data' => $query->orderBy('name')->paginate(50)]);
    }

    public function attendance(Request $request): JsonResponse|StreamedResponse
    {
        $filters = $request->validate([
            'batch_id' => ['nullable', 'integer', 'exists:batches,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'export' => ['nullable', 'boolean'],
        ]);
        $query = Attendance::query()->with(['student', 'session.batch'])
            ->whereNotNull('status')
            ->when(isset($filters['batch_id']), fn ($builder) => $builder->whereHas('session', fn ($session) => $session->where('batch_id', $filters['batch_id'])))
            ->when(isset($filters['from']), fn ($builder) => $builder->whereHas('session', fn ($session) => $session->whereDate('session_date', '>=', $filters['from'])))
            ->when(isset($filters['to']), fn ($builder) => $builder->whereHas('session', fn ($session) => $session->whereDate('session_date', '<=', $filters['to'])));

        if ($request->boolean('export')) {
            $records = $query->orderByDesc('created_at')->get();

            return response()->streamDownload(function () use ($records): void {
                $output = fopen('php://output', 'w');
                fputcsv($output, ['Date', 'Batch', 'Roll', 'Student', 'Status', 'Remarks']);
                foreach ($records as $record) {
                    fputcsv($output, array_map($this->safeCsvValue(...), [
                        $record->session->session_date->toDateString(),
                        $record->session->batch->name,
                        $record->student->roll_number,
                        $record->student->name,
                        $record->status,
                        $record->remarks,
                    ]));
                }
                fclose($output);
            }, 'attendance-report.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        return response()->json(['data' => $query->orderByDesc('created_at')->paginate(50)]);
    }

    public function exams(Request $request): JsonResponse|StreamedResponse
    {
        $data = $request->validate([
            'batch_id' => ['nullable', 'integer', 'exists:batches,id'],
            'exam_id' => ['nullable', 'integer', 'exists:exams,id'],
            'export' => ['nullable', 'boolean'],
        ]);
        $query = Exam::query()->with('batches')->withCount('results')
            ->when(isset($data['batch_id']), fn ($builder) => $builder->whereHas('batches', fn ($relation) => $relation->where('batches.id', $data['batch_id'])))
            ->when(isset($data['exam_id']), fn ($builder) => $builder->whereKey($data['exam_id']));

        if ($request->boolean('export')) {
            $examIds = $query->pluck('exams.id');
            $results = ExamResult::query()->with(['student', 'exam'])
                ->whereIn('exam_id', $examIds)
                ->when(isset($data['batch_id']), fn ($builder) => $builder->whereExists(function ($subquery) use ($data): void {
                    $subquery->selectRaw('1')
                        ->from('batch_student')
                        ->join('exam_batches', 'exam_batches.batch_id', '=', 'batch_student.batch_id')
                        ->whereColumn('exam_batches.exam_id', 'exam_results.exam_id')
                        ->whereColumn('batch_student.student_id', 'exam_results.student_id')
                        ->where('exam_batches.batch_id', $data['batch_id'])
                        ->whereRaw('DATE(batch_student.assigned_at) <= exams.exam_date')
                        ->where(fn ($query) => $query->whereNull('batch_student.ended_at')->orWhereRaw('DATE(batch_student.ended_at) >= exams.exam_date'));
                }))
                ->join('exams', 'exams.id', '=', 'exam_results.exam_id')
                ->select('exam_results.*')
                ->orderBy('exams.exam_date')
                ->get();

            return response()->streamDownload(function () use ($results): void {
                $output = fopen('php://output', 'w');
                fputcsv($output, ['Exam', 'Subject', 'Date', 'Roll', 'Student', 'Total marks', 'Obtained marks', 'Percentage', 'Status']);
                foreach ($results as $result) {
                    $obtained = $result->obtained_marks === null ? null : (float) $result->obtained_marks;
                    fputcsv($output, array_map($this->safeCsvValue(...), [
                        $result->exam->title,
                        $result->exam->subject,
                        $result->exam->exam_date->toDateString(),
                        $result->student->roll_number,
                        $result->student->name,
                        (float) $result->exam->total_marks,
                        $obtained,
                        $obtained === null ? null : round($obtained * 100 / (float) $result->exam->total_marks, 2),
                        $result->is_absent ? 'Absent' : ($obtained === null ? 'Not entered' : 'Scored'),
                    ]));
                }
                fclose($output);
            }, 'exam-results.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        return response()->json(['data' => $query->orderByDesc('exam_date')->paginate(50)]);
    }

    private function safeCsvValue(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        return preg_match('/^[\s]*[=+\-@]/u', $value) === 1 ? "'".$value : $value;
    }
}
