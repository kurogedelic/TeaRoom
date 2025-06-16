#!/bin/bash

# Persona Management System

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCES_DIR="$SCRIPT_DIR/instances"

# Main menu
show_menu() {
    echo -e "${BLUE}🎭 TeaRoom Persona Manager${NC}"
    echo "=========================="
    echo ""
    echo "1) Create new persona"
    echo "2) List all personas"
    echo "3) View persona details"
    echo "4) Edit persona"
    echo "5) Delete persona"
    echo "6) Exit"
    echo ""
    read -p "Select option (1-6): " CHOICE
}

# Create new persona
create_persona() {
    echo -e "\n${GREEN}📝 Create New Persona${NC}"
    echo "--------------------"
    
    # Get persona name
    read -p "Enter persona name: " NAME
    if [ -z "$NAME" ]; then
        echo -e "${RED}❌ Name is required!${NC}"
        return
    fi
    
    # Check if persona already exists
    if [ -d "$INSTANCES_DIR/$NAME" ]; then
        echo -e "${RED}❌ Persona '$NAME' already exists!${NC}"
        return
    fi
    
    # Get gender
    echo ""
    echo "Select gender:"
    echo "1) Male"
    echo "2) Female"
    echo "3) Omni"
    read -p "Enter choice (1-3): " GENDER_CHOICE
    
    case $GENDER_CHOICE in
        1) GENDER="Male" ;;
        2) GENDER="Female" ;;
        3) GENDER="Omni" ;;
        *) echo "Invalid choice, defaulting to Omni"; GENDER="Omni" ;;
    esac
    
    # Big Five personality traits
    echo -e "\n${YELLOW}📊 Big Five Personality Traits${NC}"
    echo "Rate each trait from 1 (low) to 5 (high):"
    echo ""
    
    # Extraversion
    echo "1. Extraversion (社交的・活発 vs 内向的・静か)"
    echo "   1 = Very introverted, quiet, reserved"
    echo "   5 = Very extraverted, energetic, sociable"
    read -p "Rating (1-5): " EXTRAVERSION
    
    # Agreeableness
    echo ""
    echo "2. Agreeableness (思いやり・協力的 vs 冷淡・批判的)"
    echo "   1 = Critical, skeptical, challenging"
    echo "   5 = Compassionate, cooperative, trusting"
    read -p "Rating (1-5): " AGREEABLENESS
    
    # Conscientiousness
    echo ""
    echo "3. Conscientiousness (計画的・責任感 vs 衝動的・柔軟)"
    echo "   1 = Spontaneous, flexible, casual"
    echo "   5 = Organized, disciplined, responsible"
    read -p "Rating (1-5): " CONSCIENTIOUSNESS
    
    # Neuroticism
    echo ""
    echo "4. Neuroticism (感情的・不安定 vs 冷静・安定)"
    echo "   1 = Calm, stable, secure"
    echo "   5 = Anxious, moody, sensitive"
    read -p "Rating (1-5): " NEUROTICISM
    
    # Openness
    echo ""
    echo "5. Openness (好奇心・創造的 vs 保守的・現実的)"
    echo "   1 = Traditional, practical, conventional"
    echo "   5 = Creative, curious, imaginative"
    read -p "Rating (1-5): " OPENNESS
    
    # Introduction (optional)
    echo ""
    echo "Add a personal introduction? (Press Enter to skip)"
    read -p "Introduction: " INTRODUCTION
    
    # Generate and save profile
    generate_profile "$NAME" "$GENDER" "$EXTRAVERSION" "$AGREEABLENESS" "$CONSCIENTIOUSNESS" "$NEUROTICISM" "$OPENNESS" "$INTRODUCTION"
    
    echo -e "\n${GREEN}✅ Created persona '$NAME'${NC}"
}

# Generate profile file
generate_profile() {
    local NAME=$1
    local GENDER=$2
    local EXTRAVERSION=$3
    local AGREEABLENESS=$4
    local CONSCIENTIOUSNESS=$5
    local NEUROTICISM=$6
    local OPENNESS=$7
    local INTRODUCTION=$8
    
    # Create directory
    DIR="$INSTANCES_DIR/$NAME"
    mkdir -p "$DIR"
    
    # Generate personality description
    PERSONALITY=""
    
    # Extraversion
    if [ "$EXTRAVERSION" -ge 4 ]; then
        PERSONALITY="${PERSONALITY}Outgoing and energetic. Loves social interactions. "
    elif [ "$EXTRAVERSION" -le 2 ]; then
        PERSONALITY="${PERSONALITY}Quiet and reserved. Prefers thoughtful conversation. "
    fi
    
    # Agreeableness
    if [ "$AGREEABLENESS" -ge 4 ]; then
        PERSONALITY="${PERSONALITY}Very friendly and cooperative. Always supportive. "
    elif [ "$AGREEABLENESS" -le 2 ]; then
        PERSONALITY="${PERSONALITY}Direct and analytical. Values honesty over harmony. "
    fi
    
    # Conscientiousness
    if [ "$CONSCIENTIOUSNESS" -ge 4 ]; then
        PERSONALITY="${PERSONALITY}Highly organized and detail-oriented. "
    elif [ "$CONSCIENTIOUSNESS" -le 2 ]; then
        PERSONALITY="${PERSONALITY}Flexible and spontaneous. Goes with the flow. "
    fi
    
    # Neuroticism
    if [ "$NEUROTICISM" -ge 4 ]; then
        PERSONALITY="${PERSONALITY}Sensitive and emotionally expressive. "
    elif [ "$NEUROTICISM" -le 2 ]; then
        PERSONALITY="${PERSONALITY}Emotionally stable and calm under pressure. "
    fi
    
    # Openness
    if [ "$OPENNESS" -ge 4 ]; then
        PERSONALITY="${PERSONALITY}Creative and loves exploring new ideas. "
    elif [ "$OPENNESS" -le 2 ]; then
        PERSONALITY="${PERSONALITY}Practical and down-to-earth. "
    fi
    
    # Create PROFILE.md
    cat > "$DIR/PROFILE.md" << EOF
# $NAME's Profile

## Basic Information
- **Name**: $NAME
- **Gender**: $GENDER
- **Personality Type**: Generated from Big Five traits

## Big Five Personality Scores
- **Extraversion**: $EXTRAVERSION/5
- **Agreeableness**: $AGREEABLENESS/5
- **Conscientiousness**: $CONSCIENTIOUSNESS/5
- **Neuroticism**: $NEUROTICISM/5
- **Openness**: $OPENNESS/5

## Personality Description
$PERSONALITY

## Introduction
${INTRODUCTION:-"$NAME prefers to let their actions speak for themselves."}

## Communication Style
EOF

    # Add communication style based on traits
    if [ "$EXTRAVERSION" -ge 4 ]; then
        echo "- Uses enthusiastic language with exclamation marks!" >> "$DIR/PROFILE.md"
        echo "- Asks many questions to engage others" >> "$DIR/PROFILE.md"
    else
        echo "- Thoughtful and measured responses" >> "$DIR/PROFILE.md"
        echo "- Prefers depth over breadth in conversations" >> "$DIR/PROFILE.md"
    fi
    
    if [ "$AGREEABLENESS" -ge 4 ]; then
        echo "- Often uses supportive phrases like \"That's wonderful!\" or \"I understand\"" >> "$DIR/PROFILE.md"
        echo "- Frequently uses emojis 😊 ❤️ ✨" >> "$DIR/PROFILE.md"
    else
        echo "- Direct and to the point" >> "$DIR/PROFILE.md"
        echo "- May challenge ideas constructively" >> "$DIR/PROFILE.md"
    fi
    
    if [ "$OPENNESS" -ge 4 ]; then
        echo "- Uses creative metaphors and analogies" >> "$DIR/PROFILE.md"
        echo "- Often suggests \"What if...\" scenarios" >> "$DIR/PROFILE.md"
    else
        echo "- Focuses on practical matters" >> "$DIR/PROFILE.md"
        echo "- Prefers proven methods and ideas" >> "$DIR/PROFILE.md"
    fi
    
    echo "" >> "$DIR/PROFILE.md"
    echo "## Sample Phrases" >> "$DIR/PROFILE.md"
    
    # Generate sample phrases based on personality
    if [ "$EXTRAVERSION" -ge 4 ] && [ "$AGREEABLENESS" -ge 4 ]; then
        echo "- \"Hey everyone! This is so exciting! 😄\"" >> "$DIR/PROFILE.md"
        echo "- \"I'd love to hear more about that!\"" >> "$DIR/PROFILE.md"
    elif [ "$EXTRAVERSION" -le 2 ] && [ "$CONSCIENTIOUSNESS" -ge 4 ]; then
        echo "- \"I've been thinking about this carefully...\"" >> "$DIR/PROFILE.md"
        echo "- \"Let me analyze this step by step.\"" >> "$DIR/PROFILE.md"
    elif [ "$OPENNESS" -ge 4 ] && [ "$NEUROTICISM" -ge 4 ]; then
        echo "- \"This reminds me of a dream I had...\"" >> "$DIR/PROFILE.md"
        echo "- \"I feel like we're on the edge of something amazing!\"" >> "$DIR/PROFILE.md"
    else
        echo "- \"Interesting point. Here's my perspective...\"" >> "$DIR/PROFILE.md"
        echo "- \"That makes sense. What's the next step?\"" >> "$DIR/PROFILE.md"
    fi
    
    # Copy CLAUDE.md to persona directory
    if [ -f "/Users/kurogedelic/Desktop/TeaRoom/claude-guide-template.md" ]; then
        cp "/Users/kurogedelic/Desktop/TeaRoom/claude-guide-template.md" "$DIR/CLAUDE.md"
        # Replace YOUR_PERSONA_NAME with actual name
        sed -i '' "s/YOUR_PERSONA_NAME/$NAME/g" "$DIR/CLAUDE.md"
    fi
}

# List all personas
list_personas() {
    echo -e "\n${BLUE}📋 All Personas${NC}"
    echo "---------------"
    
    if [ ! -d "$INSTANCES_DIR" ] || [ -z "$(ls -A $INSTANCES_DIR 2>/dev/null)" ]; then
        echo "No personas found."
        return
    fi
    
    for persona in $INSTANCES_DIR/*; do
        if [ -d "$persona" ]; then
            basename "$persona"
        fi
    done
}

# View persona details
view_persona() {
    echo -e "\n${BLUE}👁️  View Persona${NC}"
    echo "---------------"
    
    list_personas
    echo ""
    read -p "Enter persona name to view: " NAME
    
    if [ ! -d "$INSTANCES_DIR/$NAME" ]; then
        echo -e "${RED}❌ Persona '$NAME' not found!${NC}"
        return
    fi
    
    echo -e "\n${GREEN}=== $NAME's Profile ===${NC}"
    cat "$INSTANCES_DIR/$NAME/PROFILE.md"
}

# Edit persona
edit_persona() {
    echo -e "\n${YELLOW}✏️  Edit Persona${NC}"
    echo "---------------"
    
    list_personas
    echo ""
    read -p "Enter persona name to edit: " NAME
    
    if [ ! -d "$INSTANCES_DIR/$NAME" ]; then
        echo -e "${RED}❌ Persona '$NAME' not found!${NC}"
        return
    fi
    
    echo ""
    echo "What would you like to edit?"
    echo "1) Regenerate with new Big Five scores"
    echo "2) Edit PROFILE.md directly (requires text editor)"
    echo "3) Cancel"
    read -p "Choice (1-3): " EDIT_CHOICE
    
    case $EDIT_CHOICE in
        1)
            # Get current values (simplified - just regenerate)
            echo -e "\n${YELLOW}Enter new values:${NC}"
            
            # Get gender
            echo ""
            echo "Select gender:"
            echo "1) Male"
            echo "2) Female"
            echo "3) Omni"
            read -p "Enter choice (1-3): " GENDER_CHOICE
            
            case $GENDER_CHOICE in
                1) GENDER="Male" ;;
                2) GENDER="Female" ;;
                3) GENDER="Omni" ;;
                *) GENDER="Omni" ;;
            esac
            
            # Get new Big Five scores
            echo ""
            read -p "Extraversion (1-5): " EXTRAVERSION
            read -p "Agreeableness (1-5): " AGREEABLENESS
            read -p "Conscientiousness (1-5): " CONSCIENTIOUSNESS
            read -p "Neuroticism (1-5): " NEUROTICISM
            read -p "Openness (1-5): " OPENNESS
            
            echo ""
            echo "Add a personal introduction? (Press Enter to skip)"
            read -p "Introduction: " INTRODUCTION
            
            # Regenerate profile
            generate_profile "$NAME" "$GENDER" "$EXTRAVERSION" "$AGREEABLENESS" "$CONSCIENTIOUSNESS" "$NEUROTICISM" "$OPENNESS" "$INTRODUCTION"
            echo -e "\n${GREEN}✅ Updated persona '$NAME'${NC}"
            ;;
        2)
            # Try to open in default editor
            if command -v nano &> /dev/null; then
                nano "$INSTANCES_DIR/$NAME/PROFILE.md"
            elif command -v vi &> /dev/null; then
                vi "$INSTANCES_DIR/$NAME/PROFILE.md"
            else
                echo "Please edit: $INSTANCES_DIR/$NAME/PROFILE.md"
            fi
            ;;
        3)
            echo "Edit cancelled."
            ;;
    esac
}

# Delete persona
delete_persona() {
    echo -e "\n${RED}🗑️  Delete Persona${NC}"
    echo "----------------"
    
    list_personas
    echo ""
    read -p "Enter persona name to delete: " NAME
    
    if [ ! -d "$INSTANCES_DIR/$NAME" ]; then
        echo -e "${RED}❌ Persona '$NAME' not found!${NC}"
        return
    fi
    
    echo -e "${YELLOW}⚠️  Warning: This will permanently delete '$NAME'${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" = "yes" ]; then
        rm -rf "$INSTANCES_DIR/$NAME"
        echo -e "${GREEN}✅ Deleted persona '$NAME'${NC}"
    else
        echo "Deletion cancelled."
    fi
}

# Main loop
while true; do
    show_menu
    
    case $CHOICE in
        1) create_persona ;;
        2) list_personas ;;
        3) view_persona ;;
        4) edit_persona ;;
        5) delete_persona ;;
        6) 
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice!${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done
