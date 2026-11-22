<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BatchSchedule extends Model
{
    protected $fillable = ['day_of_week', 'start_time', 'end_time'];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
