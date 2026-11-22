<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SmsSettingsController extends Controller
{
    public function __construct(
        private readonly SmsService $smsService
    ) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'settings' => $this->smsService->getSettings(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'api_key' => ['required', 'string', 'max:255'],
            'sender_id' => ['required', 'string', 'max:100'],
            'api_url' => ['nullable', 'url', 'max:255'],
            'type' => ['nullable', Rule::in(['text', 'unicode'])],
        ]);

        $this->smsService->saveSettings($data);

        return response()->json([
            'message' => 'BulkSMSBD settings updated successfully.',
            'settings' => $this->smsService->getSettings(),
        ]);
    }

    public function balance(): JsonResponse
    {
        $result = $this->smsService->getBalance();

        if (! $result['success']) {
            return response()->json([
                'message' => $result['message'],
            ], 422);
        }

        return response()->json([
            'balance' => $result['balance'],
            'message' => $result['message'],
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'message' => ['required', 'string', 'max:500'],
        ]);

        $result = $this->smsService->send($data['phone'], $data['message']);

        if (! $result['success']) {
            return response()->json([
                'message' => $result['message'],
                'details' => $result['raw'] ?? null,
            ], 422);
        }

        return response()->json([
            'message' => $result['message'],
            'details' => $result['raw'] ?? null,
        ]);
    }
}
