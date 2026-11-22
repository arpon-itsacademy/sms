<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    protected function prepareForValidation(): void
    {
        $sanitize = [];

        foreach (['phone', 'father_phone', 'mother_phone', 'father_name', 'mother_name', 'gender', 'date_of_birth', 'address', 'notes'] as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $sanitize[$field] = null;
            }
        }

        if (! empty($sanitize)) {
            $this->merge($sanitize);
        }

        // If photo is not an actual uploaded file (e.g. empty string or object from JSON), remove it
        if (! $this->hasFile('photo')) {
            $this->request->remove('photo');
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'school_name' => ['required', 'string', 'max:255'],
            'class_level' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'father_phone' => ['nullable', 'string', 'max:20', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'mother_name' => ['nullable', 'string', 'max:255'],
            'mother_phone' => ['nullable', 'string', 'max:20', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'address' => ['nullable', 'string', 'max:2000'],
            'admission_date' => ['required', 'date'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string', 'max:5000'],
            'photo' => [$this->hasFile('photo') ? 'image' : 'nullable', 'max:5120'],
        ];
    }
}
