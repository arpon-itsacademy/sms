<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Batch;
use App\Models\Exam;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        $today = now()->toDateString();
        $weekday = now()->dayOfWeek;
        $schedule = Batch::query()->where('batches.status', 'active')
            ->join('batch_schedules', 'batch_schedules.batch_id', '=', 'batches.id')
            ->where('batch_schedules.day_of_week', $weekday)
            ->orderBy('batch_schedules.start_time')
            ->get(['batches.id', 'batches.name', 'batches.subject', 'batch_schedules.start_time', 'batch_schedules.end_time']);
        $attendance = Attendance::query()->join('attendance_sessions', 'attendances.attendance_session_id', '=', 'attendance_sessions.id')
            ->whereDate('attendance_sessions.session_date', $today)
            ->whereIn('attendances.status', ['present', 'absent', 'late'])
            ->selectRaw("COUNT(*) as total, SUM(attendances.status IN ('present', 'late')) as attended")
            ->first();

        return response()->json([
            'summary' => [
                'total_students' => Student::count(),
                'active_students' => Student::where('status', 'active')->count(),
                'active_batches' => Batch::where('status', 'active')->count(),
                'today_classes' => $schedule->count(),
                'total_exams' => Exam::count(),
                'attendance_rate' => $attendance->total ? round($attendance->attended * 100 / $attendance->total, 1) : 0,
            ],
            'recent_students' => Student::latest('admission_date')->limit(5)
                ->get(['id', 'roll_number', 'name', 'class_level', 'admission_date']),
            'today_schedule' => $schedule,
            'recent_exams' => Exam::latest('exam_date')->limit(5)
                ->get(['id', 'title', 'subject', 'exam_date', 'total_marks']),
            'batch_overview' => Batch::query()->where('status', 'active')
                ->withCount(['students' => fn ($query) => $query->whereNull('batch_student.ended_at')])
                ->orderBy('name')->get(['id', 'name', 'subject']),
            'attendance_week' => DB::table('attendance_sessions')
                ->join('attendances', 'attendance_sessions.id', '=', 'attendances.attendance_session_id')
                ->whereBetween('session_date', [now()->subDays(6)->toDateString(), $today])
                ->whereNotNull('attendances.status')
                ->groupBy('session_date')
                ->orderBy('session_date')
                ->selectRaw("session_date as date, SUM(attendances.status = 'present') as present, SUM(attendances.status = 'absent') as absent, SUM(attendances.status = 'late') as late")
                ->get(),
        ]);
    }
}
