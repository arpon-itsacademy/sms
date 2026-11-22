<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->string('father_name')->nullable()->change();
            $table->string('father_phone')->nullable()->change();
            $table->string('mother_name')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->string('father_name')->nullable(false)->change();
            $table->string('father_phone')->nullable(false)->change();
            $table->string('mother_name')->nullable(false)->change();
        });
    }
};
