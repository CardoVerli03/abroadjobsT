from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
import database
import config
import keywords
import logging

logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Secure Admin Panel Start"""
    user_id = update.effective_user.id
    
    if user_id != config.ADMIN_ID:
        logger.warning(f"Unauthorized access attempt by ID: {user_id}")
        return 

    keyboard = [
        [InlineKeyboardButton("📊 Live Stats", callback_data='stats'),
         InlineKeyboardButton("🚀 Force Fetch", callback_data='force')],
        [InlineKeyboardButton("📂 Job Categories", callback_data='categories')],
        [InlineKeyboardButton("🔑 Scoring Terms", callback_data='keywords')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "🇨🇦 **CANADA JOBS ADMIN**\nSecure Terminal Active. Select operation:",
        reply_markup=reply_markup, 
        parse_mode='Markdown'
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles all modern button interactions with Back navigation"""
    query = update.callback_query
    await query.answer()
    
    # 1. STATISTICS
    if query.data == 'stats':
        stats = database.get_total_stats()
        text = (
            f"📈 **Performance Report**\n\n"
            f"• Jobs Posted Today: {stats['today']}/50\n"
            f"• Total Database Size: {stats['total']}\n"
            f"• Status: Active"
        )
        keyboard = [[InlineKeyboardButton("⬅️ Back to Menu", callback_data='back_main')]]
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    # 2. VIEW CATEGORIES
    elif query.data == 'categories':
        keyboard = []
        cats = list(keywords.CATEGORIES.keys())
        for i in range(0, len(cats), 2):
            row = [InlineKeyboardButton(cats[i], callback_data=f"show_cat_{cats[i]}")]
            if i+1 < len(cats):
                row.append(InlineKeyboardButton(cats[i+1], callback_data=f"show_cat_{cats[i+1]}"))
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton("⬅️ Back", callback_data='back_main')])
        
        await query.edit_message_text("Targeted Job Sectors:", reply_markup=InlineKeyboardMarkup(keyboard))

    # 3. SHOW SPECIFIC CATEGORY TERMS
    elif query.data.startswith('show_cat_'):
        cat_name = query.data.replace('show_cat_', '')
        terms = ", ".join(keywords.CATEGORIES.get(cat_name, []))
        text = f"📂 **Category:** {cat_name}\n\n**Keywords tracked:**\n{terms}"
        keyboard = [[InlineKeyboardButton("⬅️ Back", callback_data='categories')]]
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    # 4. VIEW SCORING TERMS
    elif query.data == 'keywords':
        visa_terms = ", ".join(keywords.SCORING["VISA_SPONSORSHIP"]["terms"][:15]) # Show first 15
        exp_terms = ", ".join(keywords.SCORING["NO_EXPERIENCE"]["terms"][:15])
        text = (
            f"🔑 **Scoring Logic (Top Terms)**\n\n"
            f"**Sponsorship (+3):**\n{visa_terms}...\n\n"
            f"**No Experience (+2):**\n{exp_terms}..."
        )
        keyboard = [[InlineKeyboardButton("⬅️ Back", callback_data='back_main')]]
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    # 5. BACK TO MAIN
    elif query.data == 'back_main':
        keyboard = [
            [InlineKeyboardButton("📊 Live Stats", callback_data='stats'),
             InlineKeyboardButton("🚀 Force Fetch", callback_data='force')],
            [InlineKeyboardButton("📂 Job Categories", callback_data='categories')],
            [InlineKeyboardButton("🔑 Scoring Terms", callback_data='keywords')]
        ]
        await query.edit_message_text("🇨🇦 **CANADA JOBS ADMIN**\nSelect operation:", 
                                      reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    # 6. FORCE FETCH (Manual Trigger)
    elif query.data == 'force':
        await query.edit_message_text("🔄 **Manual Scan Initiated...**\nChecking RSS feeds for new LMIA jobs.")
        # Hapa main.py itatambua hii force fetch kupitia job_queue
        from main import auto_job_poster
        await auto_job_poster(context)
        await query.message.reply_text("✅ Manual Scan Complete.")
