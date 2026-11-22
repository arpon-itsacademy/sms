<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    protected $fillable = [
        'title', 'subject', 'exam_date', 'total_marks', 'description',
        'type', 'status', 'created_by',
    ];

    protected function casts(): array
    {
        return ['exam_date' => 'date', 'total_marks' => 'decimal:2'];
    }

    public function batches(): BelongsToMany
    {
        return $this->belongsToMany(Batch::class, 'exam_batches')->withTimestamps();
    }

    public function results(): HasMany
    {
        return $this->hasMany(ExamResult::class);
    }
}
