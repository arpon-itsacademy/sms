<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = DB::table('settings')->pluck('value', 'key')
            ->map(fn ($value) => $value === null ? null : json_decode($value, true))
            ->all();

        $logoPath = $settings['logo_path'] ?? null;
        $faviconPath = $settings['favicon_path'] ?? null;

        unset($settings['logo_path'], $settings['favicon_path']);

        return response()->json([
            'settings' => [
                ...$settings,
                'logo_url' => $logoPath ? asset('storage/'.$logoPath) : null,
                'favicon_url' => $faviconPath ? asset('storage/'.$faviconPath) : null,
                'font_size' => $settings['font_size'] ?? 'medium',
            ],
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
            'font_size' => ['nullable', 'string', Rule::in(['normal', 'medium', 'large', 'extra_large'])],
            'logo' => ['nullable', 'image', 'max:2048'],
            'favicon' => ['nullable', 'file', 'mimes:ico,png,jpg,jpeg,svg,webp', 'max:2048'],
        ]);

        $logo = $request->file('logo');
        $favicon = $request->file('favicon');

        unset($data['logo'], $data['favicon']);

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

        if ($favicon) {
            $oldFavicon = json_decode((string) DB::table('settings')->where('key', 'favicon_path')->value('value'), true);
            $newFavicon = $favicon->store('settings', 'public');
            DB::table('settings')->updateOrInsert(
                ['key' => 'favicon_path'],
                ['value' => json_encode($newFavicon, JSON_THROW_ON_ERROR), 'updated_at' => now(), 'created_at' => now()]
            );
            if (is_string($oldFavicon)) {
                Storage::disk('public')->delete($oldFavicon);
            }
        }

        return $this->show();
    }
}
