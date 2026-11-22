<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:150'],
            'exam_date' => ['required', 'date'],
            'total_marks' => ['required', 'numeric', 'gt:0', 'max:999999.99'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', Rule::in(['class_test', 'quiz', 'midterm', 'final', 'other'])],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'batch_ids' => ['required', 'array', 'min:1', 'max:100'],
            'batch_ids.*' => ['required', 'integer', 'distinct', 'exists:batches,id'],
        ];
    }
}
