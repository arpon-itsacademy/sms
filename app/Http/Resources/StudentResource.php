<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'roll_number' => $this->roll_number,
            'name' => $this->name,
            'school_name' => $this->school_name,
            'class_level' => $this->class_level,
            'phone' => $this->phone,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'father_name' => $this->father_name,
            'father_phone' => $this->father_phone,
            'mother_name' => $this->mother_name,
            'mother_phone' => $this->mother_phone,
            'address' => $this->address,
            'admission_date' => $this->admission_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'photo_url' => $this->photo_path ? asset('storage/'.$this->photo_path) : null,
            'batches' => $this->whenLoaded('batches', fn () => $this->batches
                ->map(fn ($batch) => [
                    'id' => $batch->id,
                    'name' => $batch->name,
                    'code' => $batch->code,
                    'subject' => $batch->subject,
                ])),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
