<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BatchRequest;
use App\Http\Resources\BatchResource;
use App\Http\Resources\StudentResource;
use App\Models\Batch;
use App\Models\Student;
use App\Services\EnrollmentService;
use App\Services\MonthlyFeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BatchController extends Controller
{
    public function __construct(
        private readonly EnrollmentService $enrollments,
        private readonly MonthlyFeeService $fees,
    ) {}

    public function index(Request $request)
    {
        $query = Batch::query()->with('schedules')
            ->withCount(['students' => fn ($relation) => $relation->whereNull('batch_student.ended_at')]);
        $query->when($request->filled('q'), fn ($builder) => $builder->where(fn ($builder) => $builder
            ->where('name', 'like', '%'.$request->string('q').'%')
            ->orWhere('code', 'like', '%'.$request->string('q').'%')
            ->orWhere('subject', 'like', '%'.$request->string('q').'%')));
        $query->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')));

        return BatchResource::collection($query->orderBy('name')->paginate(min($request->integer('per_page', 20), 100)));
    }

    public function store(BatchRequest $request): JsonResponse
    {
        $batch = DB::transaction(function () use ($request): Batch {
            $batch = Batch::create($request->safe()->except('schedules'));
            $batch->schedules()->createMany($request->validated('schedules'));

            return $batch;
        });

        $this->fees->generateCurrentMonth();

        return (new BatchResource($batch->load('schedules')))->response()->setStatusCode(201);
    }

    public function show(Batch $batch): BatchResource
    {
        $batch->load(['schedules', 'students' => fn ($relation) => $relation->whereNull('batch_student.ended_at')]);

        return new BatchResource($batch);
    }

    public function update(BatchRequest $request, Batch $batch): BatchResource
    {
        DB::transaction(function () use ($request, $batch): void {
            $batch->update($request->safe()->except('schedules'));
            $batch->schedules()->delete();
            $batch->schedules()->createMany($request->validated('schedules'));
        });
        $this->fees->generateCurrentMonth();

        return new BatchResource($batch->fresh()->load('schedules'));
    }

    public function students(Batch $batch, Request $request)
    {
        $query = $batch->students()->wherePivotNull('ended_at');
        $query->when($request->filled('q'), fn ($builder) => $builder->where(fn ($builder) => $builder
            ->where('students.name', 'like', '%'.$request->string('q').'%')
            ->orWhere('students.roll_number', 'like', '%'.$request->string('q').'%')));

        return StudentResource::collection($query->orderBy('students.name')->paginate(30));
    }

    public function assignStudents(Request $request, Batch $batch): JsonResponse
    {
        $data = $request->validate([
            'student_ids' => ['required', 'array', 'min:1', 'max:500'],
            'student_ids.*' => ['required', 'integer', 'distinct', 'exists:students,id'],
        ]);
        foreach (Student::whereIn('id', $data['student_ids'])->get() as $student) {
            $this->enrollments->assign($student, [$batch->id]);
        }

        return response()->json(['message' => 'Students assigned to batch.']);
    }

    public function setStatus(Request $request, Batch $batch): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:active,inactive']]);
        $batch->update($data);

        return response()->json(['data' => new BatchResource($batch)]);
    }
}
