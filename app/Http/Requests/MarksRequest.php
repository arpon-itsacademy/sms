<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class MarksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'records' => ['required', 'array', 'max:1000'],
            'records.*.student_id' => ['required', 'integer', 'distinct', 'exists:students,id'],
            'records.*.obtained_marks' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'records.*.is_absent' => ['required', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $exam = $this->route('exam');
                if (! $exam) {
                    return;
                }

                foreach ($this->input('records', []) as $index => $record) {
                    if (
                        isset($record['obtained_marks'])
                        && (float) $record['obtained_marks'] > (float) $exam->total_marks
                    ) {
                        $validator->errors()->add(
                            "records.$index.obtained_marks",
                            'Obtained marks may not exceed the exam total.'
                        );
                    }

                    if (($record['is_absent'] ?? false) && isset($record['obtained_marks'])) {
                        $validator->errors()->add(
                            "records.$index.obtained_marks",
                            'Absent students cannot have an obtained mark.'
                        );
                    }
                }
            },
        ];
    }
}
