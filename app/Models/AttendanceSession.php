<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    protected $fillable = ['batch_id', 'session_date', 'created_by'];

    protected function casts(): array
    {
        return ['session_date' => 'date'];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
