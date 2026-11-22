<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\BulkSmsController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\FeeController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SmsSettingsController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Middleware\EnsureAdministrator;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum', EnsureAdministrator::class])->group(function (): void {
    Route::put('/auth/password', [AuthController::class, 'changePassword']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/income', [FeeController::class, 'incomeSummary']);

    Route::apiResource('students', StudentController::class)->except(['destroy']);
    Route::patch('/students/{student}/status', [StudentController::class, 'setStatus']);
    Route::get('/students/{student}/attendance', [StudentController::class, 'attendance']);
    Route::get('/students/{student}/results', [StudentController::class, 'results']);
    Route::put('/students/{student}/batches', [StudentController::class, 'assignBatches']);
    Route::delete('/students/{student}/batches/{batch}', [StudentController::class, 'endBatch']);

    Route::apiResource('batches', BatchController::class)->except(['destroy']);
    Route::get('/batches/{batch}/students', [BatchController::class, 'students']);
    Route::post('/batches/{batch}/students', [BatchController::class, 'assignStudents']);
    Route::patch('/batches/{batch}/status', [BatchController::class, 'setStatus']);

    Route::get('/attendance-sessions/load', [AttendanceController::class, 'load']);
    Route::put('/attendance-sessions', [AttendanceController::class, 'save']);
    Route::get('/attendance/history', [AttendanceController::class, 'history']);

    Route::apiResource('exams', ExamController::class)->except(['destroy']);
    Route::get('/results', [ExamController::class, 'resultsIndex']);
    Route::get('/exams/{exam}/marks', [ExamController::class, 'marks']);
    Route::put('/exams/{exam}/marks', [ExamController::class, 'saveMarks']);
    Route::get('/exams/{exam}/results', [ExamController::class, 'results']);

    Route::get('/fees', [FeeController::class, 'index']);
    Route::post('/fees/{monthlyFee}/payments', [FeeController::class, 'recordPayment']);

    Route::get('/reports/students', [ReportController::class, 'students']);
    Route::get('/reports/attendance', [ReportController::class, 'attendance']);
    Route::get('/reports/exams', [ReportController::class, 'exams']);

    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::get('/settings/sms', [SmsSettingsController::class, 'show']);
    Route::put('/settings/sms', [SmsSettingsController::class, 'update']);
    Route::get('/settings/sms/balance', [SmsSettingsController::class, 'balance']);
    Route::post('/settings/sms/test', [SmsSettingsController::class, 'test']);
    Route::post('/sms/preview', [BulkSmsController::class, 'preview']);
    Route::post('/sms/send-bulk', [BulkSmsController::class, 'send']);

    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
});
