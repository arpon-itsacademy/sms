<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = DB::table('settings')->pluck('value', 'key')
            ->map(fn ($value) => $value === null ? null : json_decode($value, true))
            ->all();
        $logoPath = $settings['logo_path'] ?? null;
        unset($settings['logo_path']);

        return response()->json([
            'settings' => [...$settings, 'logo_url' => $logoPath ? asset('storage/'.$logoPath) : null],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institution_name' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:2000'],
            'classes' => ['nullable', 'array', 'max:100'],
            'classes.*' => ['string', 'max:100'],
            'subjects' => ['nullable', 'array', 'max:100'],
            'subjects.*' => ['string', 'max:150'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $logo = $request->file('logo');
        unset($data['logo']);
        DB::transaction(function () use ($data): void {
            foreach ($data as $key => $value) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => json_encode($value, JSON_THROW_ON_ERROR), 'updated_at' => now(), 'created_at' => now()]
                );
            }
        });
        if ($logo) {
            $oldPath = json_decode((string) DB::table('settings')->where('key', 'logo_path')->value('value'), true);
            $newPath = $logo->store('settings', 'public');
            DB::table('settings')->updateOrInsert(
                ['key' => 'logo_path'],
                ['value' => json_encode($newPath, JSON_THROW_ON_ERROR), 'updated_at' => now(), 'created_at' => now()]
            );
            if (is_string($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        return $this->show();
    }
}
