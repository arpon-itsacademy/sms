<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExamRequest;
use App\Http\Requests\MarksRequest;
use App\Http\Resources\ExamResource;
use App\Models\Batch;
use App\Models\Exam;
use App\Models\ExamResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExamController extends Controller
{
    public function index(Request $request)
    {
        $query = Exam::query()->with('batches')->withCount('results');
        $query->when($request->filled('q'), fn ($builder) => $builder->where(fn ($builder) => $builder
            ->where('title', 'like', '%'.$request->string('q').'%')
            ->orWhere('subject', 'like', '%'.$request->string('q').'%')));
        $query->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')));

        return ExamResource::collection($query->orderByDesc('exam_date')->paginate(min($request->integer('per_page', 20), 100)));
    }

    public function store(ExamRequest $request): JsonResponse
    {
        $data = $request->safe()->except('batch_ids');
        $exam = DB::transaction(function () use ($data, $request): Exam {
            $exam = Exam::create([...$data, 'created_by' => $request->user()->id]);
            $exam->batches()->sync($request->validated('batch_ids'));

            return $exam;
        });

        return (new ExamResource($exam->load('batches')))->response()->setStatusCode(201);
    }

    public function show(Exam $exam): ExamResource
    {
        return new ExamResource($exam->load('batches'));
    }

    public function update(ExamRequest $request, Exam $exam): ExamResource
    {
        DB::transaction(function () use ($request, $exam): void {
            $exam->update($request->safe()->except('batch_ids'));
            $exam->batches()->sync($request->validated('batch_ids'));
        });

        return new ExamResource($exam->fresh()->load('batches'));
    }

    public function marks(Request $request, Exam $exam): JsonResponse
    {
        $data = $request->validate(['batch_id' => ['required', 'integer', 'exists:batches,id']]);
        $batch = $exam->batches()->whereKey($data['batch_id'])->firstOrFail();
        $students = $batch->students()
            ->wherePivot('assigned_at', '<=', $exam->exam_date->endOfDay())
            ->where(fn ($query) => $query->whereNull('batch_student.ended_at')->orWhere('batch_student.ended_at', '>=', $exam->exam_date->startOfDay()))
            ->orderBy('students.name')->get();
        $results = $exam->results()->whereIn('student_id', $students->pluck('id'))->get()->keyBy('student_id');

        return response()->json([
            'exam' => new ExamResource($exam->load('batches')),
            'batch' => ['id' => $batch->id, 'name' => $batch->name],
            'students' => $students->map(fn ($student) => [
                'id' => $student->id,
                'roll_number' => $student->roll_number,
                'name' => $student->name,
                'obtained_marks' => $results->get($student->id)?->obtained_marks,
                'is_absent' => $results->get($student->id)?->is_absent ?? false,
            ]),
        ]);
    }

    public function saveMarks(MarksRequest $request, Exam $exam): JsonResponse
    {
        $ids = collect($request->validated('records'))->pluck('student_id')->unique();
        $eligibleIds = DB::table('batch_student')
            ->join('exam_batches', 'exam_batches.batch_id', '=', 'batch_student.batch_id')
            ->where('exam_batches.exam_id', $exam->id)
            ->whereIn('batch_student.student_id', $ids)
            ->where('batch_student.assigned_at', '<=', $exam->exam_date->endOfDay())
            ->where(fn ($query) => $query->whereNull('batch_student.ended_at')->orWhere('batch_student.ended_at', '>=', $exam->exam_date->startOfDay()))
            ->pluck('batch_student.student_id')->unique();

        if ($eligibleIds->count() !== $ids->count()) {
            throw ValidationException::withMessages([
                'records' => 'Marks can only be entered for students enrolled in one of the exam batches on its date.',
            ]);
        }

        DB::transaction(function () use ($request, $exam): void {
            foreach ($request->validated('records') as $record) {
                ExamResult::updateOrCreate(
                    ['exam_id' => $exam->id, 'student_id' => $record['student_id']],
                    [
                        'obtained_marks' => $record['is_absent'] ? null : ($record['obtained_marks'] ?? null),
                        'is_absent' => $record['is_absent'],
                        'updated_by' => $request->user()->id,
                    ]
                );
            }
        });

        return response()->json(['message' => 'Marks saved.']);
    }

    public function results(Request $request, Exam $exam): JsonResponse
    {
        $data = $request->validate(['batch_id' => ['nullable', 'integer', 'exists:batches,id']]);
        $query = $exam->results()->with('student');
        if (isset($data['batch_id'])) {
            abort_unless($exam->batches()->whereKey($data['batch_id'])->exists(), 404);
            $query->whereIn('student_id', function ($subquery) use ($data, $exam): void {
                $subquery->select('student_id')->from('batch_student')
                    ->where('batch_id', $data['batch_id'])
                    ->where('assigned_at', '<=', $exam->exam_date->endOfDay())
                    ->where(fn ($query) => $query->whereNull('ended_at')->orWhere('ended_at', '>=', $exam->exam_date->startOfDay()));
            });
        }
        $results = $query->orderBy('student_id')->paginate(50);

        return response()->json(['data' => $results->through(fn ($result) => [
            'student_id' => $result->student_id,
            'roll_number' => $result->student->roll_number,
            'student' => $result->student->name,
            'obtained_marks' => $result->obtained_marks === null ? null : (float) $result->obtained_marks,
            'total_marks' => (float) $exam->total_marks,
            'is_absent' => $result->is_absent,
            'percentage' => $result->obtained_marks === null ? null : round((float) $result->obtained_marks * 100 / (float) $exam->total_marks, 2),
        ])]);
    }

    public function resultsIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'exam_id' => ['nullable', 'integer', 'exists:exams,id'],
            'batch_id' => ['nullable', 'integer', 'exists:batches,id'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
        ]);
        $query = ExamResult::query()->with(['student', 'exam.batches'])
            ->when(isset($filters['exam_id']), fn ($builder) => $builder->where('exam_id', $filters['exam_id']))
            ->when(isset($filters['student_id']), fn ($builder) => $builder->where('student_id', $filters['student_id']))
            ->when(isset($filters['batch_id']), function ($builder) use ($filters): void {
                $builder->whereExists(function ($subquery) use ($filters): void {
                    $subquery->selectRaw('1')
                        ->from('batch_student')
                        ->join('exam_batches', 'exam_batches.batch_id', '=', 'batch_student.batch_id')
                        ->whereColumn('exam_batches.exam_id', 'exam_results.exam_id')
                        ->whereColumn('batch_student.student_id', 'exam_results.student_id')
                        ->whereColumn('batch_student.batch_id', 'exam_batches.batch_id')
                        ->where('exam_batches.batch_id', $filters['batch_id'])
                        ->whereRaw('DATE(batch_student.assigned_at) <= exams.exam_date')
                        ->where(fn ($query) => $query->whereNull('batch_student.ended_at')->orWhereRaw('DATE(batch_student.ended_at) >= exams.exam_date'));
                });
            });
        $query->join('exams', 'exams.id', '=', 'exam_results.exam_id')
            ->select('exam_results.*');
        $results = $query->orderByDesc('exam_results.updated_at')->paginate(50);

        return response()->json(['data' => $results->through(function (ExamResult $result) use ($filters): array {
            $batch = $result->exam->batches->first(fn (Batch $batch) => ! isset($filters['batch_id']) || $batch->id === (int) $filters['batch_id']);

            return [
                'exam_id' => $result->exam->id,
                'student_id' => $result->student->id,
                'roll_number' => $result->student->roll_number,
                'student' => $result->student->name,
                'exam' => $result->exam->title,
                'subject' => $result->exam->subject,
                'batch' => $batch?->name,
                'exam_date' => $result->exam->exam_date->toDateString(),
                'total_marks' => (float) $result->exam->total_marks,
                'obtained_marks' => $result->obtained_marks === null ? null : (float) $result->obtained_marks,
                'is_absent' => $result->is_absent,
                'percentage' => $result->obtained_marks === null ? null : round((float) $result->obtained_marks * 100 / (float) $result->exam->total_marks, 2),
            ];
        })]);
    }
}
