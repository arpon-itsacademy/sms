<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\Batch;
use App\Models\Student;
use App\Services\EnrollmentService;
use App\Services\StudentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function __construct(
        private readonly StudentService $students,
        private readonly EnrollmentService $enrollments,
    ) {}

    public function index(Request $request)
    {
        $query = Student::query()->with(['batches' => fn ($relation) => $relation->whereNull('batch_student.ended_at')]);
        $query->when($request->filled('q'), function ($builder) use ($request): void {
            $term = '%'.$request->string('q')->trim().'%';
            $builder->where(function ($builder) use ($term): void {
                $builder->where('name', 'like', $term)
                    ->orWhere('roll_number', 'like', $term)
                    ->orWhere('school_name', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('father_phone', 'like', $term);
            });
        });
        $query->when($request->filled('class_level'), fn ($builder) => $builder->where('class_level', $request->string('class_level')));
        $query->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')));
        $query->when($request->filled('batch_id'), fn ($builder) => $builder->whereHas('batches', fn ($relation) => $relation
            ->where('batches.id', $request->integer('batch_id'))
            ->whereNull('batch_student.ended_at')));
        $sort = $request->input('sort', 'admission_date');
        $direction = $request->input('direction', 'desc');
        if (! in_array($sort, ['admission_date', 'name', 'roll_number'], true)) {
            $sort = 'admission_date';
        }

        return StudentResource::collection($query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc')->paginate(min($request->integer('per_page', 15), 100)));
    }

    public function store(StudentRequest $request): JsonResponse
    {
        $student = $this->students->create(
            $request->safe()->except('photo'),
            $request->file('photo')
        );

        return (new StudentResource($student->load('batches')))->response()->setStatusCode(201);
    }

    public function show(Student $student): StudentResource
    {
        return new StudentResource($student->load(['batches' => fn ($relation) => $relation->whereNull('batch_student.ended_at')]));
    }

    public function update(StudentRequest $request, Student $student): StudentResource
    {
        $this->students->update(
            $student,
            $request->safe()->except('photo'),
            $request->file('photo')
        );

        return new StudentResource($student->load(['batches' => fn ($relation) => $relation->whereNull('batch_student.ended_at')]));
    }

    public function setStatus(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:active,inactive']]);
        $student->update($data);

        return response()->json(['data' => new StudentResource($student)]);
    }

    public function assignBatches(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'batch_ids' => ['required', 'array', 'min:1', 'max:100'],
            'batch_ids.*' => ['required', 'integer', 'distinct', 'exists:batches,id'],
        ]);
        $this->enrollments->assign($student, $data['batch_ids']);

        return response()->json(['data' => new StudentResource($student->fresh()->load([
            'batches' => fn ($relation) => $relation->whereNull('batch_student.ended_at'),
        ]))]);
    }

    public function attendance(Student $student): JsonResponse
    {
        $records = $student->attendances()->with('session.batch')
            ->whereNotNull('status')->orderByDesc('created_at')->paginate(30);
        $totals = $student->attendances()->whereNotNull('status')
            ->selectRaw("SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) as attended")
            ->selectRaw("SUM(CASE WHEN status <> 'excused' THEN 1 ELSE 0 END) as counted")
            ->selectRaw('COUNT(*) as total')
            ->first();

        return response()->json([
            'data' => $records->through(fn ($record) => [
                'date' => $record->session->session_date->toDateString(),
                'batch' => $record->session->batch->name,
                'status' => $record->status,
                'remarks' => $record->remarks,
            ]),
            'summary' => [
                'total_sessions' => (int) $totals->total,
                'attended' => (int) $totals->attended,
                'percentage' => $totals->counted ? round($totals->attended * 100 / $totals->counted, 2) : 0,
            ],
        ]);
    }

    public function results(Student $student): JsonResponse
    {
        $results = $student->examResults()->with(['exam.batches'])->latest()->paginate(30);

        return response()->json([
            'data' => $results->through(fn ($result) => [
                'exam_id' => $result->exam->id,
                'title' => $result->exam->title,
                'subject' => $result->exam->subject,
                'batch' => $result->exam->batches->pluck('name')->implode(', '),
                'exam_date' => $result->exam->exam_date->toDateString(),
                'total_marks' => (float) $result->exam->total_marks,
                'obtained_marks' => $result->obtained_marks === null ? null : (float) $result->obtained_marks,
                'is_absent' => $result->is_absent,
                'percentage' => $result->obtained_marks === null ? null : round((float) $result->obtained_marks * 100 / (float) $result->exam->total_marks, 2),
            ]),
        ]);
    }

    public function endBatch(Student $student, Batch $batch): JsonResponse
    {
        $this->enrollments->end($student, $batch);

        return response()->json(['message' => 'Batch enrollment ended.']);
    }
}
