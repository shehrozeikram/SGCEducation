<?php
echo "Attempting to kill node.exe processes...\n";
$output = [];
$retval = null;
exec('taskkill /f /im node.exe 2>&1', $output, $retval);
echo "Exit code: $retval\n";
echo "Output:\n" . implode("\n", $output) . "\n";
