#!/bin/bash

# Test installation script for CR
echo "========================================="
echo "Testing CR Installation"
echo "========================================="

# Test commands
echo "1. Version check:"
cr version

echo -e "\n2. Help check:"
cr help | head -5

echo -e "\n3. Status check:"
cr status

echo -e "\n========================================="
echo "Installation test complete!"
echo "========================================="
echo ""
echo "If all commands worked, CR is properly installed."
echo "To start using CR:"
echo "  1. cr start      # Start the service"
echo "  2. cr ui         # Configure providers"
echo "  3. cr code '...' # Use with prompts"
echo ""