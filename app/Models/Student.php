<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    protected $fillable = [
        'name', 'school_name', 'class_level', 'phone', 'gender',
        'date_of_birth', 'photo_path', 'father_name', 'father_phone',
        'mother_name', 'mother_phone', 'address', 'admission_date',
        'status', 'notes',
    ];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date', 'admission_date' => 'date'];
    }

    public function batches(): BelongsToMany
    {
        return $this->belongsToMany(Batch::class)
            ->withPivot(['id', 'assigned_at', 'ended_at', 'status'])
            ->withTimestamps();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function examResults(): HasMany
    {
        return $this->hasMany(ExamResult::class);
    }

    public function monthlyFees(): HasMany
    {
        return $this->hasMany(MonthlyFee::class);
    }
}
