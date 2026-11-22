<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Batch;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Student;
use App\Models\User;
use App\Services\EnrollmentService;
use App\Services\StudentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Demo data cannot be seeded in production.');
        }

        $email = (string) env('DEMO_ADMIN_EMAIL');
        $password = (string) env('DEMO_ADMIN_PASSWORD');
        if ($email === '' || strlen($password) < 12) {
            throw new RuntimeException('Set DEMO_ADMIN_EMAIL and a 12-character DEMO_ADMIN_PASSWORD before seeding.');
        }
        if (DB::table('settings')->where('key', 'demo_seeded')->exists()) {
            $this->command?->info('Demo records have already been seeded.');

            return;
        }

        $admin = User::firstOrCreate(
            ['email' => $email],
            ['name' => 'Demo Administrator', 'password' => Hash::make($password), 'role' => 'admin']
        );
        $studentService = app(StudentService::class);
        $enrollmentService = app(EnrollmentService::class);
        $students = collect();
        $classes = ['7', '8', '9', '10', '11'];

        for ($index = 1; $index <= 20; $index++) {
            $students->push($studentService->create([
                'name' => fake()->name(),
                'school_name' => fake()->randomElement(['Greenfield High School', 'North Star Academy', 'Lakeview School']),
                'class_level' => fake()->randomElement($classes),
                'phone' => $this->phone(),
                'gender' => fake()->randomElement(['male', 'female']),
                'date_of_birth' => fake()->dateTimeBetween('-18 years', '-10 years')->format('Y-m-d'),
                'father_name' => fake()->name('male'),
                'father_phone' => $this->phone(),
                'mother_name' => fake()->name('female'),
                'mother_phone' => $this->phone(),
                'address' => fake()->streetAddress().', Dhaka',
                'admission_date' => fake()->dateTimeBetween('-90 days', 'now')->format('Y-m-d'),
                'status' => fake()->randomElement(['active', 'active', 'active', 'inactive']),
                'notes' => null,
            ]));
        }

        $batches = collect();
        foreach ([
            ['Physics Batch A', 'PHY-9-A', 'Physics', '9'],
            ['Chemistry Batch A', 'CHEM-9-A', 'Chemistry', '9'],
            ['Mathematics Batch B', 'MATH-10-B', 'Mathematics', '10'],
            ['Biology Batch A', 'BIO-10-A', 'Biology', '10'],
            ['English Batch C', 'ENG-8-C', 'English', '8'],
        ] as [$name, $code, $subject, $class]) {
            $batch = Batch::firstOrCreate(
                ['code' => $code],
                ['name' => $name, 'subject' => $subject, 'class_level' => $class, 'status' => 'active']
            );
            if (! $batch->schedules()->exists()) {
                $batch->schedules()->createMany([
                    ['day_of_week' => 0, 'start_time' => '16:00', 'end_time' => '17:30'],
                    ['day_of_week' => 2, 'start_time' => '16:00', 'end_time' => '17:30'],
                ]);
            }
            $batches->push($batch);
        }

        foreach ($batches as $batchIndex => $batch) {
            $assigned = $students->slice($batchIndex * 3, 9);
            foreach ($assigned as $student) {
                $enrollmentService->assign($student, [$batch->id]);
            }
            $session = AttendanceSession::query()->where('batch_id', $batch->id)
                ->whereDate('session_date', now()->toDateString())->first();
            if (! $session) {
                $session = AttendanceSession::create([
                    'batch_id' => $batch->id,
                    'session_date' => now()->toDateString(),
                    'created_by' => $admin->id,
                ]);
            }
            foreach ($assigned as $student) {
                Attendance::firstOrCreate(
                    ['attendance_session_id' => $session->id, 'student_id' => $student->id],
                    ['status' => fake()->randomElement(['present', 'present', 'late', 'absent'])]
                );
            }
        }

        foreach ([
            ['Chapter 1 Class Test', 'Physics', [0, 1]],
            ['Term Practice Quiz', 'Chemistry', [1, 3]],
            ['Monthly Assessment', 'Mathematics', [2, 4]],
        ] as [$title, $subject, $batchIndexes]) {
            $exam = Exam::create([
                'title' => $title,
                'subject' => $subject,
                'exam_date' => now()->toDateString(),
                'total_marks' => 30,
                'description' => 'Fictional demo assessment data.',
                'type' => 'class_test',
                'status' => 'published',
                'created_by' => $admin->id,
            ]);
            $examBatches = $batches->only($batchIndexes);
            $exam->batches()->sync($examBatches->pluck('id'));
            $eligible = $students->filter(fn (Student $student) => $student->batches()
                ->whereIn('batches.id', $examBatches->pluck('id'))->wherePivotNull('ended_at')->exists());
            foreach ($eligible as $student) {
                ExamResult::firstOrCreate(
                    ['exam_id' => $exam->id, 'student_id' => $student->id],
                    [
                        'obtained_marks' => fake()->randomFloat(2, 12, 30),
                        'is_absent' => false,
                        'updated_by' => $admin->id,
                    ]
                );
            }
        }

        DB::table('settings')->insert([
            'key' => 'demo_seeded',
            'value' => json_encode(true, JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function phone(): string
    {
        return fake()->randomElement(['013', '014', '015', '016', '017', '018', '019']).fake()->numerify('########');
    }
}
