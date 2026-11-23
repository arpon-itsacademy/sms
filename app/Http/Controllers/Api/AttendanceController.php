<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendanceRequest;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Batch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    public function load(Request $request): JsonResponse
    {
        $data = $request->validate([
            'batch_id' => ['required', 'integer', 'exists:batches,id'],
            'date' => ['required', 'date', 'before_or_equal:today'],
        ]);
        $batch = Batch::findOrFail($data['batch_id']);
        $date = $data['date'];
        $students = $batch->students()
            ->wherePivot('assigned_at', '<=', $date.' 23:59:59')
            ->where(fn ($query) => $query->whereNull('batch_student.ended_at')->orWhere('batch_student.ended_at', '>=', $date.' 00:00:00'))
            ->orderBy('students.name')->get();
        $session = AttendanceSession::where('batch_id', $batch->id)->whereDate('session_date', $date)->first();
        $records = $session?->records()->get()->keyBy('student_id') ?? collect();

        return response()->json([
            'session_id' => $session?->id,
            'students' => $students->map(fn ($student) => [
                'id' => $student->id,
                'roll_number' => $student->roll_number,
                'name' => $student->name,
                'status' => $records->get($student->id)?->status,
                'remarks' => $records->get($student->id)?->remarks,
            ]),
        ]);
    }

    public function save(AttendanceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $date = $data['session_date'];
        $batchId = $data['batch_id'];

        $session = DB::transaction(function () use ($request, $data, $date, $batchId): AttendanceSession {
            $batch = Batch::query()->lockForUpdate()->findOrFail($batchId);
            $session = AttendanceSession::query()
                ->where('batch_id', $batch->id)
                ->whereDate('session_date', $date)
                ->first();
            if (! $session) {
                $session = AttendanceSession::create([
                    'batch_id' => $batch->id,
                    'session_date' => $date,
                    'created_by' => $request->user()->id,
                ]);
            }

            $ids = collect($data['records'])->pluck('student_id')->unique();
            $enrolledIds = DB::table('batch_student')
                ->where('batch_id', $batch->id)
                ->whereIn('student_id', $ids)
                ->where('assigned_at', '<=', $date.' 23:59:59')
                ->where(fn ($query) => $query->whereNull('ended_at')->orWhere('ended_at', '>=', $date.' 00:00:00'))
                ->pluck('student_id')->map(fn ($id) => (int) $id);

            if ($enrolledIds->count() !== $ids->count()) {
                throw ValidationException::withMessages([
                    'records' => 'Attendance can only be recorded for students enrolled in the batch on the selected date.',
                ]);
            }

            foreach ($data['records'] as $record) {
                Attendance::updateOrCreate(
                    ['attendance_session_id' => $session->id, 'student_id' => $record['student_id']],
                    ['status' => $record['status'] ?? null, 'remarks' => $record['remarks'] ?? null]
                );
            }

            return $session;
        });

        // Trigger automated absent SMS alert if enabled
        try {
            app(SmsAutomationController::class)->dispatchAbsentAlerts($session, $data['records']);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Absent SMS dispatch error: ' . $e->getMessage());
        }

        return response()->json(['data' => $session->load('records.student')]);
    }

    public function history(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'batch_id' => ['nullable', 'integer', 'exists:batches,id'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['nullable', 'in:present,absent,late,excused'],
        ]);
        $query = Attendance::query()->with(['student', 'session.batch'])->whereNotNull('status');
        $query->when(isset($filters['batch_id']), fn ($builder) => $builder->whereHas('session', fn ($session) => $session->where('batch_id', $filters['batch_id'])));
        $query->when(isset($filters['student_id']), fn ($builder) => $builder->where('student_id', $filters['student_id']));
        $query->when(isset($filters['status']), fn ($builder) => $builder->where('status', $filters['status']));
        $query->when(isset($filters['from']), fn ($builder) => $builder->whereHas('session', fn ($session) => $session->whereDate('session_date', '>=', $filters['from'])));
        $query->when(isset($filters['to']), fn ($builder) => $builder->whereHas('session', fn ($session) => $session->whereDate('session_date', '<=', $filters['to'])));
        $records = $query->orderByDesc('created_at')->paginate(50);
        $summary = (clone $query)->selectRaw("COUNT(*) as total, SUM(status = 'present') as present, SUM(status = 'absent') as absent, SUM(status = 'late') as late, SUM(status = 'excused') as excused")->first();

        return response()->json([
            'data' => $records->through(fn ($record) => [
                'date' => $record->session->session_date->toDateString(),
                'batch' => $record->session->batch->name,
                'roll_number' => $record->student->roll_number,
                'student' => $record->student->name,
                'status' => $record->status,
                'remarks' => $record->remarks,
            ]),
            'summary' => [
                'total' => (int) $summary->total,
                'present' => (int) $summary->present,
                'absent' => (int) $summary->absent,
                'late' => (int) $summary->late,
                'excused' => (int) $summary->excused,
                'percentage' => ($counted = (int) $summary->present + (int) $summary->absent + (int) $summary->late)
                    ? round(((int) $summary->present + (int) $summary->late) * 100 / $counted, 2) : 0,
            ],
        ]);
    }
}
