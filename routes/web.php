<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

// Secure helper to run migrations and cache clearing on cPanel without SSH
Route::get('/app-migrate/{token}', function (string $token) {
    $deployKey = env('DEPLOY_KEY');
    if (empty($deployKey) || !hash_equals($deployKey, $token)) {
        abort(403, 'Unauthorized access.');
    }

    Artisan::call('migrate', ['--force' => true]);
    $migrateOutput = Artisan::output();

    Artisan::call('storage:link');
    $storageOutput = Artisan::output();

    Artisan::call('optimize:clear');
    $optimizeOutput = Artisan::output();

    return response("<pre style='background:#18181b;color:#4ade80;padding:24px;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.6;'>
=== DATABASE MIGRATIONS ===
" . htmlspecialchars($migrateOutput) . "
=== STORAGE SYMLINK ===
" . htmlspecialchars($storageOutput) . "
=== CACHE CLEAR ===
" . htmlspecialchars($optimizeOutput) . "
&check; Live server database & cache updated successfully!
</pre>");
});

// Secure helper to create/reset the primary administrator account
Route::get('/app-create-admin/{token}', function (string $token) {
    $deployKey = env('DEPLOY_KEY');
    if (empty($deployKey) || !hash_equals($deployKey, $token)) {
        abort(403, 'Unauthorized access.');
    }

    $email = request('email', 'admin@tabassumenglish.com');
    $password = request('password', 'Admin@Tabassum2026!');
    $name = request('name', 'Administrator');

    $user = User::updateOrCreate(
        ['email' => $email],
        [
            'name' => $name,
            'password' => Hash::make($password),
            'role' => 'admin',
        ]
    );

    return response("<pre style='background:#18181b;color:#4ade80;padding:24px;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.6;'>
&check; Administrator account configured successfully!

Name:     " . htmlspecialchars($name) . "
Email:    " . htmlspecialchars($email) . "
Password: " . htmlspecialchars($password) . "

You can now sign in at: <a href='/login' style='color:#38bdf8;'>https://tabassumenglish.com/login</a>
</pre>");
});

// Single Page Application (SPA) catch-all route:
// Serves React frontend for all web routes, while leaving /api, /sanctum, /up, /app-migrate untouched.
Route::get('/{any?}', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    return view('welcome');
})->where('any', '^(?!api|sanctum|up|app-migrate|app-create-admin).*$');
