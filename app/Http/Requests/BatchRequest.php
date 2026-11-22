<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class BatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        $uniqueCode = Rule::unique('batches', 'code');
        if ($batch = $this->route('batch')) {
            $uniqueCode->ignore($batch->id);
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', $uniqueCode],
            'subject' => ['nullable', 'string', 'max:150'],
            'class_level' => ['nullable', 'string', 'max:100'],
            'monthly_fee' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', 'in:active,inactive'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'schedules' => ['present', 'array', 'max:21'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.start_time' => ['required', 'date_format:H:i'],
            'schedules.*.end_time' => ['required', 'date_format:H:i'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                foreach ($this->input('schedules', []) as $index => $schedule) {
                    if (
                        isset($schedule['start_time'], $schedule['end_time'])
                        && $schedule['end_time'] <= $schedule['start_time']
                    ) {
                        $validator->errors()->add(
                            "schedules.$index.end_time",
                            'The end time must be after the start time.'
                        );
                    }
                }
            },
        ];
    }
}
