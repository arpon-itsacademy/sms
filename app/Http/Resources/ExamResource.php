<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'subject' => $this->subject,
            'exam_date' => $this->exam_date?->toDateString(),
            'total_marks' => (float) $this->total_marks,
            'description' => $this->description,
            'type' => $this->type,
            'status' => $this->status,
            'batches' => $this->whenLoaded('batches', fn () => $this->batches->map(fn ($batch) => [
                'id' => $batch->id,
                'name' => $batch->name,
                'code' => $batch->code,
            ])),
        ];
    }
}
