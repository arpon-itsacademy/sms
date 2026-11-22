<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'subject' => $this->subject,
            'class_level' => $this->class_level,
            'monthly_fee' => (float) $this->monthly_fee,
            'description' => $this->description,
            'status' => $this->status,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'students_count' => $this->whenCounted('students'),
            'schedules' => $this->whenLoaded('schedules'),
            'students' => StudentResource::collection($this->whenLoaded('students')),
        ];
    }
}
