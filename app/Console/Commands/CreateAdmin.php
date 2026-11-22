<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CreateAdmin extends Command
{
    protected $signature = 'admin:create {--name=} {--email=} {--password-stdin : Read the password from standard input}';

    protected $description = 'Create an administrator account; registration is not public.';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Administrator name');
        $email = $this->option('email') ?: $this->ask('Administrator email');
        $password = $this->option('password-stdin')
            ? trim((string) fgets(STDIN))
            : $this->secret('Password (minimum 12 characters)');

        try {
            validator(
                compact('name', 'email', 'password'),
                [
                    'name' => ['required', 'string', 'max:255'],
                    'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                    'password' => ['required', 'string', 'min:12'],
                ]
            )->validate();
        } catch (ValidationException $exception) {
            foreach ($exception->errors() as $messages) {
                foreach ($messages as $message) {
                    $this->error($message);
                }
            }

            return self::FAILURE;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'admin',
        ]);
        $this->info("Administrator account created for {$email}.");

        return self::SUCCESS;
    }
}
