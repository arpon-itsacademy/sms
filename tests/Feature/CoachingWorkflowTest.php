<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Exam;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CoachingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admission_assigns_a_unique_server_generated_roll(): void
    {
        $this->actingAs($this->admin());

        $first = $this->postJson('/api/students', $this->studentData())->assertCreated();
        $second = $this->postJson('/api/students', $this->studentData(['name' => 'Samira Akter']))->assertCreated();

        $first->assertJsonPath('data.roll_number', 'STD-000001');
        $second->assertJsonPath('data.roll_number', 'STD-000002');
        $this->assertSame(2, Student::count());
    }

    public function test_batch_enrollment_and_attendance_are_idempotent_and_editable(): void
    {
        $this->actingAs($this->admin());
        $batch = $this->createBatch('Physics Batch A');
        $student = $this->createStudent();
        $this->putJson("/api/students/{$student->id}/batches", ['batch_ids' => [$batch->id]])->assertOk();
        $this->putJson("/api/students/{$student->id}/batches", ['batch_ids' => [$batch->id]])->assertOk();

        $this->assertSame(1, DB::table('batch_student')->where('student_id', $student->id)->whereNull('ended_at')->count());
        $this->getJson('/api/batches')->assertOk()->assertJsonPath('data.0.students_count', 1);
        $this->getJson('/api/dashboard/summary')->assertOk()->assertJsonPath('summary.total_students', 1);

        $payload = [
            'batch_id' => $batch->id,
            'session_date' => now()->toDateString(),
            'records' => [['student_id' => $student->id, 'status' => 'present', 'remarks' => '']],
        ];
        $first = $this->putJson('/api/attendance-sessions', $payload)->assertOk();
        $unmarkedStudent = $this->createStudent();
        $this->putJson("/api/students/{$unmarkedStudent->id}/batches", ['batch_ids' => [$batch->id]])->assertOk();
        $this->putJson('/api/attendance-sessions', [
            ...$payload,
            'records' => [
                ['student_id' => $student->id, 'status' => 'late', 'remarks' => 'Arrived late'],
                ['student_id' => $unmarkedStudent->id, 'status' => null, 'remarks' => null],
            ],
        ])->assertOk();

        $this->assertSame(1, DB::table('attendance_sessions')->where('batch_id', $batch->id)->count());
        $this->assertSame(2, DB::table('attendances')->count());
        $this->assertSame('late', DB::table('attendances')->where('student_id', $student->id)->value('status'));
        $this->assertNotNull($first->json('data.id'));
        $this->getJson('/api/attendance/history')->assertOk()->assertJsonPath('summary.total', 1);
        $this->getJson('/api/reports/attendance?export=1')->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_exam_can_cover_multiple_batches_with_one_authoritative_result(): void
    {
        $this->actingAs($this->admin());
        $firstBatch = $this->createBatch('Physics Batch A');
        $secondBatch = $this->createBatch('Physics Batch B', 'PHY-B');
        $student = $this->createStudent();
        $this->putJson("/api/students/{$student->id}/batches", ['batch_ids' => [$firstBatch->id, $secondBatch->id]])->assertOk();

        $examResponse = $this->postJson('/api/exams', [
            'title' => 'Chapter 1 Test',
            'subject' => 'Physics',
            'exam_date' => now()->toDateString(),
            'total_marks' => 30,
            'type' => 'class_test',
            'status' => 'draft',
            'batch_ids' => [$firstBatch->id, $secondBatch->id],
        ])->assertCreated();
        $examId = $examResponse->json('data.id');

        $this->putJson("/api/exams/{$examId}/marks", [
            'records' => [['student_id' => $student->id, 'obtained_marks' => 24.5, 'is_absent' => false]],
        ])->assertOk();

        $this->assertSame(2, DB::table('exam_batches')->where('exam_id', $examId)->count());
        $this->assertSame(1, DB::table('exam_results')->where('exam_id', $examId)->count());
        $this->getJson("/api/results?exam_id={$examId}")->assertOk()
            ->assertJsonPath('data.data.0.obtained_marks', 24.5);
        $this->getJson("/api/students/{$student->id}/results")->assertOk()
            ->assertJsonPath('data.data.0.percentage', 81.67);
        $this->get('/api/reports/exams?export=1')->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->get('/api/reports/students?export=1')->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $this->putJson("/api/exams/{$examId}/marks", [
            'records' => [['student_id' => $student->id, 'obtained_marks' => 31, 'is_absent' => false]],
        ])->assertUnprocessable();
    }

    public function test_private_student_records_require_admin_authentication(): void
    {
        $this->getJson('/api/students')->assertUnauthorized();
        $this->getJson('/api/dashboard/summary')->assertUnauthorized();
    }

    public function test_admin_can_sign_in_through_the_stateful_spa_auth_endpoint(): void
    {
        $admin = $this->admin();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/auth/login', [
                'email' => $admin->email,
                'password' => 'correct horse battery staple',
            ])
            ->assertOk()
            ->assertJsonPath('user.email', $admin->email);
    }

    public function test_student_profile_keeps_its_roll_and_batch_schedule_rejects_invalid_times(): void
    {
        $this->actingAs($this->admin());
        $studentResponse = $this->postJson('/api/students', $this->studentData())->assertCreated();
        $student = Student::findOrFail($studentResponse->json('data.id'));
        $this->putJson("/api/students/{$student->id}", $this->studentData([
            'name' => 'Updated Student Name',
            'roll_number' => 'STD-999999',
        ]))->assertOk()->assertJsonPath('data.name', 'Updated Student Name')
            ->assertJsonPath('data.roll_number', 'STD-000001');

        $this->postJson('/api/batches', [
            'name' => 'Invalid Schedule Batch',
            'code' => 'BAD-01',
            'status' => 'active',
            'schedules' => [['day_of_week' => 1, 'start_time' => '17:30', 'end_time' => '16:00']],
        ])->assertUnprocessable();

        $this->postJson('/api/batches', [
            'name' => 'Valid Schedule Batch',
            'code' => 'GOOD-01',
            'monthly_fee' => 0,
            'status' => 'active',
            'schedules' => [['day_of_week' => 1, 'start_time' => '16:00', 'end_time' => '17:30']],
        ])->assertCreated();
    }

    public function test_batch_monthly_fees_generate_idempotent_invoices_and_accept_partial_payments(): void
    {
        $this->actingAs($this->admin());
        $batch = $this->createBatch('Physics Batch A', 'PHY-A', 1000);
        $student = $this->createStudent();
        $this->putJson("/api/students/{$student->id}/batches", ['batch_ids' => [$batch->id]])->assertOk();

        $month = now(config('app.timezone'))->format('Y-m');
        $response = $this->getJson("/api/fees?month={$month}")->assertOk();
        $invoice = $response->json('data.data.0');
        $this->assertSame(1, count($response->json('data.data')));
        $this->assertEquals(1000, $invoice['amount']);
        $this->getJson("/api/fees?month={$month}")->assertOk();
        $this->assertSame(1, DB::table('monthly_fees')->count());

        $this->postJson("/api/fees/{$invoice['id']}/payments", [
            'amount' => 400,
            'paid_at' => now(config('app.timezone'))->toDateString(),
            'method' => 'cash',
        ])->assertCreated()->assertJsonPath('invoice.paid_amount', 400);
        $this->getJson("/api/fees?month={$month}&status=partial")->assertOk()
            ->assertJsonPath('summary.outstanding', 600);
        $this->postJson("/api/fees/{$invoice['id']}/payments", [
            'amount' => 601,
            'paid_at' => now(config('app.timezone'))->toDateString(),
            'method' => 'cash',
        ])->assertUnprocessable();
        $this->postJson("/api/fees/{$invoice['id']}/payments", [
            'amount' => 600,
            'paid_at' => now(config('app.timezone'))->toDateString(),
            'method' => 'mobile_banking',
            'reference' => 'TX-001',
        ])->assertCreated()->assertJsonPath('invoice.status', 'paid');

        $this->getJson("/api/fees?month={$month}&status=paid")->assertOk()
            ->assertJsonPath('summary.total_paid', 1000);
        $this->getJson('/api/dashboard/income?year='.now(config('app.timezone'))->year.'&batch_id='.$batch->id)->assertOk()
            ->assertJsonPath('year_income', 1000)
            ->assertJsonPath('outstanding', 0);
    }

    public function test_demo_seeder_is_optional_and_creates_the_documented_sample_set(): void
    {
        putenv('DEMO_ADMIN_EMAIL=demo-admin@example.test');
        putenv('DEMO_ADMIN_PASSWORD=local-test-password-123');
        $_ENV['DEMO_ADMIN_EMAIL'] = 'demo-admin@example.test';
        $_ENV['DEMO_ADMIN_PASSWORD'] = 'local-test-password-123';

        try {
            $this->seed(DemoSeeder::class);
            $this->assertSame(1, User::where('email', 'demo-admin@example.test')->count());
            $this->assertSame(20, Student::count());
            $this->assertSame(5, Batch::count());
            $this->assertSame(3, Exam::count());

            $this->seed(DemoSeeder::class);
            $this->assertSame(20, Student::count());
            $this->assertSame(5, Batch::count());
        } finally {
            putenv('DEMO_ADMIN_EMAIL');
            putenv('DEMO_ADMIN_PASSWORD');
            unset($_ENV['DEMO_ADMIN_EMAIL'], $_ENV['DEMO_ADMIN_PASSWORD']);
        }
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Coaching Admin',
            'email' => fake()->unique()->safeEmail(),
            'password' => Hash::make('correct horse battery staple'),
            'role' => 'admin',
        ]);
    }

    private function studentData(array $overrides = []): array
    {
        return [
            'name' => 'Rahim Uddin',
            'school_name' => 'Example High School',
            'class_level' => '9',
            'father_name' => 'Karim Uddin',
            'father_phone' => '01712345678',
            'mother_name' => 'Nadia Uddin',
            'admission_date' => now()->toDateString(),
            'status' => 'active',
            ...$overrides,
        ];
    }

    private function createStudent(): Student
    {
        $response = $this->postJson('/api/students', $this->studentData())->assertCreated();

        return Student::findOrFail($response->json('data.id'));
    }

    private function createBatch(string $name, string $code = 'PHY-A', float $monthlyFee = 0): Batch
    {
        $response = $this->postJson('/api/batches', [
            'name' => $name,
            'code' => $code,
            'subject' => 'Physics',
            'class_level' => '9',
            'monthly_fee' => $monthlyFee,
            'status' => 'active',
            'schedules' => [],
        ])->assertCreated();

        return Batch::findOrFail($response->json('data.id'));
    }
}
