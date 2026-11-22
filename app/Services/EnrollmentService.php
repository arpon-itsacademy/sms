<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EnrollmentService
{
    public function __construct(private readonly MonthlyFeeService $fees) {}

    public function assign(Student $student, array $batchIds): void
    {
        DB::transaction(function () use ($student, $batchIds): void {
            $student = Student::query()->lockForUpdate()->findOrFail($student->id);
            $batches = Batch::query()->whereIn('id', $batchIds)->where('status', 'active')->get();
            if ($batches->count() !== count(array_unique($batchIds))) {
                throw ValidationException::withMessages([
                    'batch_ids' => 'Every selected batch must exist and be active.',
                ]);
            }

            foreach ($batches as $batch) {
                $active = DB::table('batch_student')
                    ->where('student_id', $student->id)
                    ->where('batch_id', $batch->id)
                    ->whereNull('ended_at')
                    ->exists();

                if (! $active) {
                    DB::table('batch_student')->insert([
                        'student_id' => $student->id,
                        'batch_id' => $batch->id,
                        'assigned_at' => now(),
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });

        $this->fees->generateCurrentMonth();
    }

    public function end(Student $student, Batch $batch): void
    {
        DB::table('batch_student')
            ->where('student_id', $student->id)
            ->where('batch_id', $batch->id)
            ->whereNull('ended_at')
            ->update(['ended_at' => now(), 'status' => 'ended', 'updated_at' => now()]);
    }
}
