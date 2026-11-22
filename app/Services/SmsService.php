<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Get all SMS settings from the database.
     */
    public function getSettings(): array
    {
        $keys = [
            'bulksms_api_key',
            'bulksms_sender_id',
            'bulksms_api_url',
            'bulksms_type',
        ];

        $raw = DB::table('settings')
            ->whereIn('key', $keys)
            ->pluck('value', 'key')
            ->map(fn ($val) => $val === null ? null : json_decode($val, true))
            ->all();

        return [
            'api_key' => $raw['bulksms_api_key'] ?? '',
            'sender_id' => $raw['bulksms_sender_id'] ?? '',
            'api_url' => $raw['bulksms_api_url'] ?? 'https://bulksmsbd.net/api/smsapi',
            'type' => $raw['bulksms_type'] ?? 'text',
            'is_configured' => ! empty($raw['bulksms_api_key']) && ! empty($raw['bulksms_sender_id']),
        ];
    }

    /**
     * Save SMS configuration settings.
     */
    public function saveSettings(array $data): void
    {
        $map = [
            'bulksms_api_key' => $data['api_key'] ?? '',
            'bulksms_sender_id' => $data['sender_id'] ?? '',
            'bulksms_api_url' => ! empty($data['api_url']) ? $data['api_url'] : 'https://bulksmsbd.net/api/smsapi',
            'bulksms_type' => $data['type'] ?? 'text',
        ];

        DB::transaction(function () use ($map): void {
            foreach ($map as $key => $value) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $key],
                    [
                        'value' => json_encode($value, JSON_THROW_ON_ERROR),
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        });
    }

    /**
     * Send an SMS via BulkSMSBD API.
     *
     * @param  string|array  $numbers  Phone number or array of phone numbers
     * @param  string  $message  Text message
     */
    public function send(string|array $numbers, string $message): array
    {
        $settings = $this->getSettings();

        if (! $settings['is_configured']) {
            return [
                'success' => false,
                'message' => 'BulkSMSBD is not configured. Please save your API Key and Sender ID first.',
            ];
        }

        // Format phone numbers
        $recipientList = is_array($numbers) ? $numbers : explode(',', (string) $numbers);
        $formatted = [];
        foreach ($recipientList as $num) {
            $cleaned = preg_replace('/[^0-9]/', '', trim((string) $num));
            if (! empty($cleaned)) {
                $formatted[] = $cleaned;
            }
        }

        if (empty($formatted)) {
            return [
                'success' => false,
                'message' => 'No valid recipient phone number provided.',
            ];
        }

        $recipientString = implode(',', $formatted);

        // Auto-detect Unicode (e.g. Bangla characters)
        $isUnicode = strlen($message) !== mb_strlen($message, 'UTF-8');
        $smsType = $isUnicode ? 'unicode' : ($settings['type'] ?? 'text');

        $apiUrl = $settings['api_url'];

        try {
            $response = Http::timeout(20)->asForm()->post($apiUrl, [
                'api_key' => $settings['api_key'],
                'type' => $smsType,
                'number' => $recipientString,
                'senderid' => $settings['sender_id'],
                'message' => $message,
            ]);

            $body = $response->json() ?? [];

            // BulkSMSBD standard response code 202 indicates accepted/sent
            $responseCode = $body['response_code'] ?? null;
            if ($responseCode === 202 || ($body['success_message'] ?? null)) {
                return [
                    'success' => true,
                    'message' => $body['success_message'] ?? 'SMS sent successfully.',
                    'response_code' => $responseCode,
                    'raw' => $body,
                ];
            }

            return [
                'success' => false,
                'message' => $body['error_message'] ?? ($body['msg'] ?? 'BulkSMSBD returned error code: '.$responseCode),
                'response_code' => $responseCode,
                'raw' => $body,
            ];
        } catch (Exception $e) {
            Log::error('BulkSMSBD send failed: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'SMS gateway connection error: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Get account balance from BulkSMSBD.
     */
    public function getBalance(): array
    {
        $settings = $this->getSettings();

        if (empty($settings['api_key'])) {
            return [
                'success' => false,
                'message' => 'API Key is missing in BulkSMSBD configuration.',
            ];
        }

        try {
            $response = Http::timeout(15)->get('https://bulksmsbd.net/api/getBalanceApi', [
                'api_key' => $settings['api_key'],
            ]);

            $body = $response->json() ?? [];
            $responseCode = $body['response_code'] ?? null;

            if ($responseCode === 202 && isset($body['balance'])) {
                return [
                    'success' => true,
                    'balance' => $body['balance'],
                    'message' => 'Balance fetched successfully.',
                ];
            }

            return [
                'success' => false,
                'message' => $body['error_message'] ?? 'Could not retrieve balance. Check your API Key.',
                'raw' => $body,
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Could not connect to BulkSMSBD balance API: '.$e->getMessage(),
            ];
        }
    }
}
