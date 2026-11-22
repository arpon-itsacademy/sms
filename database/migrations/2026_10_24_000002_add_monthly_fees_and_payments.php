<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->decimal('monthly_fee', 10, 2)->default(0)->after('class_level');
        });

        Schema::create('monthly_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('batch_id')->constrained()->restrictOnDelete();
            $table->date('billing_month');
            $table->decimal('amount', 10, 2);
            $table->timestamps();
            $table->unique(['student_id', 'batch_id', 'billing_month']);
            $table->index(['billing_month', 'batch_id']);
        });

        Schema::create('fee_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_fee_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 10, 2);
            $table->dateTime('paid_at');
            $table->string('method')->default('cash');
            $table->string('reference')->nullable();
            $table->foreignId('received_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['paid_at', 'monthly_fee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_payments');
        Schema::dropIfExists('monthly_fees');
        Schema::table('batches', function (Blueprint $table) {
            $table->dropColumn('monthly_fee');
        });
    }
};
