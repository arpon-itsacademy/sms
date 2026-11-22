<?php

namespace App\Services;

use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StudentService
{
    public function create(array $attributes, ?UploadedFile $photo = null): Student
    {
        return DB::transaction(function () use ($attributes, $photo): Student {
            $student = Student::create($attributes);
            $student->forceFill(['roll_number' => 'STD-'.str_pad((string) $student->id, 6, '0', STR_PAD_LEFT)]);
            if ($photo) {
                $student->photo_path = $photo->store('students', 'public');
            }
            $student->save();

            return $student;
        });
    }

    public function update(Student $student, array $attributes, ?UploadedFile $photo = null): Student
    {
        $student->fill($attributes);
        if ($photo) {
            if ($student->photo_path) {
                Storage::disk('public')->delete($student->photo_path);
            }
            $student->photo_path = $photo->store('students', 'public');
        }
        $student->save();

        return $student;
    }
}
