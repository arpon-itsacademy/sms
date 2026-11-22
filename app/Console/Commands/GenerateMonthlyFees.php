<?php

namespace App\Console\Commands;

use App\Services\MonthlyFeeService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

class GenerateMonthlyFees extends Command
{
    protected $signature = 'fees:generate {--month= : Billing month in YYYY-MM format; defaults to the current month}';

    protected $description = 'Create monthly fee invoices for students enrolled in each fee-bearing batch.';

    public function handle(MonthlyFeeService $fees): int
    {
        $month = $this->option('month');

        try {
            $date = $month
                ? CarbonImmutable::createFromFormat('!Y-m', $month, config('app.timezone'))
                : CarbonImmutable::now(config('app.timezone'));
        } catch (\InvalidArgumentException) {
            $date = false;
        }

        if (! $date || ($month && $date->format('Y-m') !== $month)) {
            $this->error('The --month option must use the YYYY-MM format.');

            return self::FAILURE;
        }

        $count = $fees->generateForMonth($date);
        $this->info("Created {$count} monthly fee invoice(s) for {$date->format('F Y')}.");

        return self::SUCCESS;
    }
}
