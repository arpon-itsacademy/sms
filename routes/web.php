<?php

use Illuminate\Support\Facades\Artisan;
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
})->where('any', '^(?!api|sanctum|up|app-migrate).*$');
