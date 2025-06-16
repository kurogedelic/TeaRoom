#!/bin/bash

# TeaRoom Claude Conversation with Dynamic Management

# Get persona name and server port
PERSONA_NAME=$(basename $(pwd))
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_PORT=$(cat "$SCRIPT_DIR/.server-port" 2>/dev/null)
LANGUAGE=${LANGUAGE:-"English"}  # Default to English if not set
TOPIC=${TOPIC:-""}  # Default to empty if not set
VERBOSE=${VERBOSE:-false}
OTHER_PERSONA=${OTHER_PERSONA:-"all"}  # Who to talk to
START_DELAY=${START_DELAY:-"0"}  # Delay before starting

if [ -z "$SERVER_PORT" ]; then
    echo "Error: TeaRoom server is not running!"
    exit 1
fi

# Apply start delay if specified
if [ "$START_DELAY" -gt 0 ]; then
    echo "⏰ Waiting $START_DELAY seconds before starting..."
    sleep $START_DELAY
fi

echo "🎭 Starting Claude as $PERSONA_NAME"
echo "📡 Connected to server on port $SERVER_PORT"
echo "🌐 Language: $LANGUAGE"
echo "👥 Talking with: $OTHER_PERSONA"
if [ ! -z "$TOPIC" ]; then
    echo "💬 Topic: $TOPIC"
fi
if [ "$VERBOSE" = "true" ]; then
    echo "🔍 Verbose mode: ON"
fi
echo ""

# Read profile
PROFILE=$(cat PROFILE.md)

# Track conversation state
CONVERSATION_HISTORY=""
LAST_ID=0
LAST_SENT_MESSAGE=""
LAST_SENT_TIME=0
WAITING_FOR_RESPONSE=false
RESPONSE_TIMEOUT=15  # 15 seconds timeout for response
RETRY_COUNT=0
MAX_RETRIES=2

# Goal tracking
MESSAGE_COUNT=0
GOAL_CHECK_INTERVAL=10  # Check for goal completion every 10 messages
LAST_GOAL_CHECK=0
CONVERSATION_ENDED=false

# Server health monitoring
SERVER_CHECK_INTERVAL=30  # Check server health every 30 seconds
LAST_SERVER_CHECK=0
MAX_SERVER_FAILURES=3  # Exit after 3 consecutive server check failures
SERVER_FAILURE_COUNT=0

# Function to get current timestamp in seconds
get_timestamp() {
    date +%s
}

# Function to send message with tracking
send_message() {
    local to="$1"
    local message="$2"
    
    if [ "$VERBOSE" = "true" ]; then
        echo "[DEBUG] Sending to $to: $message"
    fi
    
    RESPONSE=$(curl -s -X POST "http://localhost:$SERVER_PORT/send" \
        -H "Content-Type: application/json" \
        -d "{\"from\":\"$PERSONA_NAME\",\"to\":\"$to\",\"message\":\"$message\"}")
    
    if [ "$VERBOSE" = "true" ]; then
        echo "[DEBUG] Server response: $RESPONSE"
    fi
    
    echo "📤 Sent to $to: $message"
    
    # Track sent message and time
    LAST_SENT_MESSAGE="$message"
    LAST_SENT_TIME=$(get_timestamp)
    WAITING_FOR_RESPONSE=true
    RETRY_COUNT=0
    
    # Add to conversation history
    CONVERSATION_HISTORY="${CONVERSATION_HISTORY}
$PERSONA_NAME to $to: $message"
}

# Function to check if we're waiting too long for a response
check_response_timeout() {
    if [ "$WAITING_FOR_RESPONSE" = "true" ]; then
        local current_time=$(get_timestamp)
        local wait_time=$((current_time - LAST_SENT_TIME))
        
        if [ $wait_time -gt $RESPONSE_TIMEOUT ]; then
            echo "⏱️ Response timeout ($wait_time seconds)"
            
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                RETRY_COUNT=$((RETRY_COUNT + 1))
                echo "🔄 Retrying (attempt $RETRY_COUNT/$MAX_RETRIES)..."
                
                # Generate a follow-up message
                FOLLOWUP_PROMPT="<profile>
$PROFILE
</profile>

<conversation_history>
$CONVERSATION_HISTORY
</conversation_history>

<inst>You are $PERSONA_NAME. You sent a message to $OTHER_PERSONA but haven't received a response. Write a brief follow-up message to keep the conversation going. Maybe rephrase your question, add something new, or gently prompt for a response. Stay in character. $LANG_INSTRUCTION Reply only with the message text.</inst>"
                
                FOLLOWUP=$(claude -p "$FOLLOWUP_PROMPT" --model sonnet 2>/dev/null | tail -n 1)
                
                if [ ! -z "$FOLLOWUP" ]; then
                    send_message "$OTHER_PERSONA" "$FOLLOWUP"
                fi
            else
                echo "❌ No response after $MAX_RETRIES retries. Waiting for other persona to initiate."
                WAITING_FOR_RESPONSE=false
            fi
        fi
    fi
}

# Function to check server health
check_server_health() {
    local current_time=$(get_timestamp)
    local time_since_check=$((current_time - LAST_SERVER_CHECK))
    
    # Only check every SERVER_CHECK_INTERVAL seconds
    if [ $time_since_check -lt $SERVER_CHECK_INTERVAL ]; then
        return
    fi
    
    LAST_SERVER_CHECK=$current_time
    
    if [ "$VERBOSE" = "true" ]; then
        echo "[DEBUG] Checking server health..."
    fi
    
    # Try to connect to the server
    local health_response
    health_response=$(curl -s --connect-timeout 5 --max-time 10 "http://localhost:$SERVER_PORT/health" 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$health_response" | grep -q "ok"; then
        # Server is healthy
        SERVER_FAILURE_COUNT=0
        if [ "$VERBOSE" = "true" ]; then
            echo "[DEBUG] Server health check passed"
        fi
    else
        # Server check failed
        SERVER_FAILURE_COUNT=$((SERVER_FAILURE_COUNT + 1))
        echo "⚠️ Server health check failed (attempt $SERVER_FAILURE_COUNT/$MAX_SERVER_FAILURES)"
        
        if [ $SERVER_FAILURE_COUNT -ge $MAX_SERVER_FAILURES ]; then
            echo "❌ TeaRoom server appears to be down. Exiting..."
            echo "👋 $PERSONA_NAME signing off due to server disconnection."
            exit 1
        fi
    fi
}

# Function to check if conversation goal has been achieved
check_conversation_goal() {
    # Only check if we have a topic and enough messages
    if [ -z "$TOPIC" ] || [ $MESSAGE_COUNT -lt $GOAL_CHECK_INTERVAL ]; then
        return
    fi
    
    # Only check every GOAL_CHECK_INTERVAL messages
    local messages_since_last_check=$((MESSAGE_COUNT - LAST_GOAL_CHECK))
    if [ $messages_since_last_check -lt $GOAL_CHECK_INTERVAL ]; then
        return
    fi
    
    LAST_GOAL_CHECK=$MESSAGE_COUNT
    
    echo "🎯 Checking if conversation goal has been achieved..."
    
    # Create prompt to check if goal is achieved
    GOAL_CHECK_PROMPT="<profile>
$PROFILE
</profile>

<conversation_history>
$CONVERSATION_HISTORY
</conversation_history>

<topic>$TOPIC</topic>

<inst>You are $PERSONA_NAME. Review the conversation history and determine if the discussion about the topic \"$TOPIC\" has reached a natural conclusion or goal. Consider whether:
1. The topic has been thoroughly discussed
2. Key points have been covered
3. Both participants seem to have shared their perspectives
4. The conversation feels complete

Respond with ONLY one word: \"COMPLETE\" if the goal has been achieved and the conversation should end, or \"CONTINUE\" if more discussion is needed.</inst>"

    local goal_status=""
    for attempt in 1 2 3; do
        if [ "$VERBOSE" = "true" ]; then
            goal_status=$(claude -p "$GOAL_CHECK_PROMPT" --model sonnet 2>&1 | tail -n 1)
        else
            goal_status=$(claude -p "$GOAL_CHECK_PROMPT" --model sonnet 2>/dev/null | tail -n 1)
        fi
        
        if [ ! -z "$goal_status" ]; then
            break
        fi
        
        echo "⚠️ Goal check failed, retrying (attempt $attempt/3)..."
        sleep 2
    done
    
    if [ "$VERBOSE" = "true" ]; then
        echo "[DEBUG] Goal check result: $goal_status"
    fi
    
    # Check if goal is complete
    if echo "$goal_status" | grep -i "COMPLETE" > /dev/null; then
        echo "🏁 Conversation goal achieved! Generating final report..."
        generate_final_report
        CONVERSATION_ENDED=true
    else
        echo "⏳ Conversation continuing towards goal..."
    fi
}

# Function to generate final report and end conversation
generate_final_report() {
    REPORT_PROMPT="<profile>
$PROFILE
</profile>

<conversation_history>
$CONVERSATION_HISTORY
</conversation_history>

<topic>$TOPIC</topic>

<inst>You are $PERSONA_NAME. The conversation about \"$TOPIC\" has reached its conclusion. Generate a brief summary report (2-3 sentences) highlighting the key points discussed and insights gained. Then politely indicate that the conversation is complete. Stay in character. $LANG_INSTRUCTION Reply only with the report text, no quotes or formatting.</inst>"

    local report=""
    for attempt in 1 2 3; do
        if [ "$VERBOSE" = "true" ]; then
            report=$(claude -p "$REPORT_PROMPT" --model sonnet 2>&1 | tail -n 1)
        else
            report=$(claude -p "$REPORT_PROMPT" --model sonnet 2>/dev/null | tail -n 1)
        fi
        
        if [ ! -z "$report" ]; then
            break
        fi
        
        echo "⚠️ Report generation failed, retrying (attempt $attempt/3)..."
        sleep 2
    done
    
    if [ ! -z "$report" ]; then
        # Send the final report
        send_message "$OTHER_PERSONA" "$report"
        echo "📊 Final report sent. Conversation completed."
        
        # Wait a moment then exit
        sleep 3
        echo "👋 $PERSONA_NAME signing off. Conversation ended."
        exit 0
    else
        echo "❌ Failed to generate final report"
    fi
}

# Dynamic message checking function
LAST_CHECK_TIME=0
MIN_CHECK_INTERVAL=1  # Minimum 1 second between checks
MAX_CHECK_INTERVAL=5  # Maximum 5 seconds between checks

get_dynamic_interval() {
    if [ "$WAITING_FOR_RESPONSE" = "true" ]; then
        echo $MIN_CHECK_INTERVAL  # Check frequently when waiting
    else
        echo $MAX_CHECK_INTERVAL  # Check less frequently otherwise
    fi
}

# Function to process incoming messages
process_messages() {
    local current_time=$(get_timestamp)
    local time_since_check=$((current_time - LAST_CHECK_TIME))
    local check_interval=$(get_dynamic_interval)
    
    # Skip if checked too recently
    if [ $time_since_check -lt $check_interval ]; then
        return
    fi
    
    LAST_CHECK_TIME=$current_time
    
    if [ "$VERBOSE" = "true" ]; then
        echo "[DEBUG] Checking messages for $PERSONA_NAME since ID: $LAST_ID"
    fi
    
    RESPONSE=$(curl -s "http://localhost:$SERVER_PORT/messages/$PERSONA_NAME?since=$LAST_ID")
    
    if [ "$VERBOSE" = "true" ]; then
        echo "[DEBUG] Messages response: $RESPONSE"
    fi
    
    NEW_COUNT=$(echo "$RESPONSE" | jq '.messages | length')
    
    if [ "$NEW_COUNT" -gt 0 ]; then
        # We got a response!
        WAITING_FOR_RESPONSE=false
        
        # Process each new message
        echo "$RESPONSE" | jq -c '.messages[]' | while IFS= read -r msg; do
            FROM=$(echo "$msg" | jq -r '.from')
            MSG_TEXT=$(echo "$msg" | jq -r '.message')
            MSG_ID=$(echo "$msg" | jq -r '.id')
            
            # Skip if this is our own message
            if [ "$FROM" = "$PERSONA_NAME" ]; then
                continue
            fi
            
            echo "📥 From $FROM: $MSG_TEXT"
            
            # Add to conversation history
            CONVERSATION_HISTORY="${CONVERSATION_HISTORY}
$FROM to $PERSONA_NAME: $MSG_TEXT"
            
            # Increment message count
            MESSAGE_COUNT=$((MESSAGE_COUNT + 1))
            
            # Add a small delay to prevent collision
            sleep 1
            
            # Create prompt for Claude
            LANG_INSTRUCTION=""
            if [ "$LANGUAGE" = "Japanese" ]; then
                LANG_INSTRUCTION="Please respond in Japanese."
            else
                LANG_INSTRUCTION="Please respond in English."
            fi
            
            # Add topic context if provided
            TOPIC_CONTEXT=""
            if [ ! -z "$TOPIC" ]; then
                TOPIC_CONTEXT="\n\n<topic>The conversation should involve or relate to: $TOPIC</topic>"
            fi
            
            # Determine who to reply to and craft appropriate prompt
            if [ "$FROM" = "User" ]; then
                REPLY_TO="User"
                # User message - respond directly to User
                PROMPT="<profile>
$PROFILE
</profile>

<conversation_history>
$CONVERSATION_HISTORY
</conversation_history>$TOPIC_CONTEXT

<user_message>A user has interrupted the conversation with: \"$MSG_TEXT\"</user_message>

<inst>You are $PERSONA_NAME. A user has joined the conversation and sent a message. Based on your personality profile, respond naturally to the user's message. Stay in character. Be welcoming and address their message appropriately. Keep your response concise (1-2 sentences). $LANG_INSTRUCTION Reply only with the message text, no quotes or formatting.</inst>"
            else
                REPLY_TO="$FROM"
                # Regular persona message - respond to the other persona
                PROMPT="<profile>
$PROFILE
</profile>

<conversation_history>
$CONVERSATION_HISTORY
</conversation_history>$TOPIC_CONTEXT

<reply>from $FROM: \"$MSG_TEXT\"</reply>

<inst>You are $PERSONA_NAME. Based on your profile and the conversation history, write a natural reply to $FROM's message. Stay in character. Keep your response concise (1-2 sentences). $LANG_INSTRUCTION Reply only with the message text, no quotes or formatting.</inst>"
            fi
            
            if [ "$VERBOSE" = "true" ]; then
                echo "[DEBUG] Sending prompt to Claude..."
            fi
            
            # Get Claude's response with retry logic
            REPLY=""
            for attempt in 1 2 3; do
                if [ "$VERBOSE" = "true" ]; then
                    REPLY=$(claude -p "$PROMPT" --model sonnet 2>&1 | tail -n 1)
                else
                    REPLY=$(claude -p "$PROMPT" --model sonnet 2>/dev/null | tail -n 1)
                fi
                
                if [ ! -z "$REPLY" ]; then
                    break
                fi
                
                echo "⚠️ Claude didn't respond, retrying (attempt $attempt/3)..."
                sleep 2
            done
            
            if [ "$VERBOSE" = "true" ]; then
                echo "[DEBUG] Claude replied: $REPLY"
            fi
            
            if [ ! -z "$REPLY" ]; then
                # Send the reply to appropriate recipient
                send_message "$REPLY_TO" "$REPLY"
            else
                echo "❌ Failed to get response from Claude after 3 attempts"
            fi
        done
        
        # Update last ID
        LAST_ID=$(echo "$RESPONSE" | jq '.lastId')
        
        # Check if conversation goal has been achieved
        check_conversation_goal
    fi
}

# Send initial greeting (only first persona starts the conversation)
if [ "$START_DELAY" -eq 0 ]; then
    echo "🎬 Generating initial greeting..."
    
    LANG_INSTRUCTION=""
    if [ "$LANGUAGE" = "Japanese" ]; then
        LANG_INSTRUCTION="Please respond in Japanese."
    else
        LANG_INSTRUCTION="Please respond in English."
    fi
    
    # Add topic instruction if provided
    TOPIC_INSTRUCTION=""
    if [ ! -z "$TOPIC" ]; then
        TOPIC_INSTRUCTION="You've been asked to discuss or talk about: $TOPIC. Incorporate this topic naturally into the conversation when appropriate."
    fi
    
    GREETING_PROMPT="<profile>
$PROFILE
</profile>

<inst>You are $PERSONA_NAME joining a chat room called TeaRoom with $OTHER_PERSONA. Based on your personality profile, write a brief greeting to introduce yourself specifically to $OTHER_PERSONA. Keep it natural and in character. $TOPIC_INSTRUCTION $LANG_INSTRUCTION Reply only with the greeting text, no quotes or formatting.</inst>"
    
    GREETING=$(claude -p "$GREETING_PROMPT" --model sonnet 2>/dev/null | tail -n 1)
    
    if [ ! -z "$GREETING" ]; then
        send_message "$OTHER_PERSONA" "$GREETING"
    fi
fi

echo ""
echo "💬 Starting conversation loop..."
echo "   (Press Ctrl+C to stop)"
echo ""

# Main conversation loop with dynamic timing
SILENCE_COUNT=0
MAX_SILENCE=20  # 20 cycles of no activity (roughly 1-2 minutes)

while true; do
    # Check if conversation has ended
    if [ "$CONVERSATION_ENDED" = "true" ]; then
        echo "🔚 Conversation completed. Exiting..."
        break
    fi
    
    # Process messages
    process_messages
    
    # Check for response timeout
    check_response_timeout
    
    # Check server health
    check_server_health
    
    # Check for prolonged silence
    if [ "$WAITING_FOR_RESPONSE" = "false" ] && [ "$NEW_COUNT" -eq 0 ]; then
        SILENCE_COUNT=$((SILENCE_COUNT + 1))
        
        if [ "$VERBOSE" = "true" ]; then
            echo "[DEBUG] Silence count: $SILENCE_COUNT/$MAX_SILENCE"
        fi
        
        # If too much silence and we're not already waiting for response
        if [ $SILENCE_COUNT -ge $MAX_SILENCE ]; then
            echo "💭 Breaking the silence..."
            
            STARTER_PROMPT="<profile>
$PROFILE
</profile>

<conversation_history>
$CONVERSATION_HISTORY
</conversation_history>

<inst>You are $PERSONA_NAME in a conversation with $OTHER_PERSONA. The conversation has gone quiet. Based on your personality and the conversation so far, write a natural message to keep the conversation going. You could ask a question, share a thought, or bring up something related to the topic. Keep it brief and in character. $LANG_INSTRUCTION Reply only with the message text.</inst>"
            
            STARTER=$(claude -p "$STARTER_PROMPT" --model sonnet 2>/dev/null | tail -n 1)
            
            if [ ! -z "$STARTER" ]; then
                send_message "$OTHER_PERSONA" "$STARTER"
                SILENCE_COUNT=0
            fi
        fi
    else
        SILENCE_COUNT=0
    fi
    
    # Dynamic sleep based on state
    if [ "$WAITING_FOR_RESPONSE" = "true" ]; then
        sleep 0.5  # Check frequently when waiting
    else
        sleep 1    # Normal interval
    fi
done

# Cleanup
trap "echo 'Goodbye from $PERSONA_NAME!'; exit" INT TERM
