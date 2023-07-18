const TelegramBot = require('node-telegram-bot-api');
const poe = require('./poe-client');
const fs = require('fs');

const config = require('./config.json');

const poe_settings = {
  bot: 'capybara',
};

const {
  botToken,
  defaultTextFilePath,
  anotherTextFilePath,
  longtermem,
  instructions,
  pmemory,
  tmemory,
  clientKey
} = config;

const bot = new TelegramBot(botToken, { polling: true });
const longTerm = longtermem;

async function initPOEClient() {
  const client = new poe.Client();
  await client.init(clientKey);

  const instructionsText = fs.readFileSync(instructions, 'utf8');
  await client.send_message(poe_settings.bot, instructionsText);

  return client;
}

function deleteMessages(message) {
  for (let i = 0; i < 101; i++) {
    bot.deleteMessage(message.chat.id, message.message_id - i).catch(err => {
      return;
    });
    // If there aren't any messages to delete, the bot will simply return
  }
}

function switchBrains(bot, chat_id) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'GPT:3.5', callback_data: 'brain_a' },
        ],
        [
          { text: 'SAGE', callback_data: 'brain_b' },
        ],
        [
          { text: 'CLAUDE-INSTANT', callback_data: 'brain_c' },
        ],
        [
          { text: 'GOOGLE-PaLM', callback_data: 'brain_d' },
        ],
        [
          { text: 'GPT-16K', callback_data: 'brain_e' },
        ],
        [
          { text: 'CLAUDE-INSTANT-100k', callback_data: 'brain_f' },
        ],
        [
          { text: 'GPT-4-32K', callback_data: 'brain_g' },
        ],
        [
          { text: 'CLAUDE-2-100k', callback_data: 'brain_h' },
        ],
        [
          { text: 'GPT-4', callback_data: 'brain_i' },
        ],
      ],
    },
  };

  const reply = 'Choose a brain:';
  bot.sendMessage(chat_id, reply, options);

  bot.on('callback_query', (query) => {
    const { data } = query;
    const chat_id = query.message.chat.id;

    if (data === 'brain_a') {
      bot.sendMessage(chat_id, 'You selected GPT.');
      poe_settings.bot = 'chinchilla';
    } else if (data === 'brain_b') {
      bot.sendMessage(chat_id, 'You selected Sage.');
      poe_settings.bot = 'capybara';
    } else if (data === 'brain_c') {
      bot.sendMessage(chat_id, 'You selected CLAUDE-INSTANT.');
      poe_settings.bot = 'a2';
    } else if (data === 'brain_d') {
      bot.sendMessage(chat_id, 'You selected Google-PaLM.');
      poe_settings.bot = 'acouchy';
    } else if (data === 'brain_e') {
      bot.sendMessage(chat_id, 'You selected GPT-16K.');
      poe_settings.bot = 'agouti';
    } else if (data === 'brain_f') {
      bot.sendMessage(chat_id, 'You selected CLAUDE-INSTANT-100k.');
      poe_settings.bot = 'a2_100k';
    } else if (data === 'brain_g') {
      bot.sendMessage(chat_id, 'You selected GPT-4-32K.');
      poe_settings.bot = 'vizcacha';
    } else if (data === 'brain_h') {
      bot.sendMessage(chat_id, 'You selected CLAUDE-2-100k.');
      poe_settings.bot = 'a2_2';
    } else if (data === 'brain_i') {
      bot.sendMessage(chat_id, 'You selected GPT-4.');
      poe_settings.bot = 'beaver';
    }
  });
}

async function calculateSimilarity(sentence1, sentence2) {
  const generateEmbeddings = await import('@xenova/transformers').then(({ pipeline }) => {
    return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  });

  const output1 = await generateEmbeddings(sentence1, {
    pooling: 'mean',
    normalize: true,
  });

  const output2 = await generateEmbeddings(sentence2, {
    pooling: 'mean',
    normalize: true,
  });

  const similarity = dotProduct(output1.data, output2.data);
  return similarity;
}

async function findMostSimilarSentence(query, sentences) {
  const generateEmbeddings = await import('@xenova/transformers').then(({ pipeline }) => {
    return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  });

  let mostSimilar = '';
  let maxSimilarity = -Infinity;

  for (const sentence of sentences) {
    const similarity = await calculateSimilarity(query, sentence);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilar = sentence;
    }
  }

  return mostSimilar;
}




function dotProduct(a, b) {
  if (a.length !== b.length) {
    throw new Error('Both arguments must have the same length');
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i];
  }

  return result;
}

function formatReplyText(text) {
  const trimmedText = text.replace(/^Sara\s*:\s*/, ' ');
  const formattedText = trimmedText.replace(/\*(.*?)\*/g, '<i>$1</i>');
  return formattedText;
}

async function purgeConversation(client, chatbot) {
  let messageHistory = await client.get_message_history(chatbot, 100);

  if (messageHistory.length > 0) {
    const messageIds = messageHistory.map((message) => message.node.messageId);
    await client.delete_message(messageIds);
    await purgeConversation(client, chatbot);
  }
}

function clearAppendedMessages() {
  fs.writeFileSync(tmemory, '');
}

const MAX_MESSAGES = 30; // Maximum number of messages to keep in memory

async function handleIncomingMessage(client, chat_id, message) {
  let reply;

  if (message.text === '/newstart') {
    deleteMessages(message);
    await purgeConversation(client, poe_settings.bot);
    const defaultText = fs.readFileSync(defaultTextFilePath, 'utf8');

    for await (const mes of client.send_message(poe_settings.bot, defaultText)) {
      reply = mes.text;
    }

    if (reply === 'Understood.') {
      fs.appendFileSync(longTerm, fs.readFileSync(tmemory, 'utf8'));
      clearAppendedMessages();
    }
  } else {
    if (message.text === '/start') {
      reply = "booting up";
      bot.sendMessage(chat_id, reply, { parse_mode: 'HTML' });
    }

    if (message.text === '/switchbrains') {
      switchBrains(bot, chat_id);
      return;
    } else if (message.text !== '/start') {
      fs.appendFileSync(tmemory, `ray : ${message.text}\n`);
      await purgeConversation(client, poe_settings.bot);

      const updatedText = fs.readFileSync(tmemory, 'utf8');
      const instructionsText = fs.readFileSync(instructions, 'utf8');
      const permanentText = fs.readFileSync(pmemory, 'utf8');
      const longTermText = fs.readFileSync(longTerm, 'utf8');

      const userInput = message.text;
      const longTermSentences = longTermText.split('\n').filter(Boolean);

      const mostSimilarSentence = await findMostSimilarSentence(userInput, longTermSentences);

      fs.appendFileSync(tmemory, `Sara : ${mostSimilarSentence}\n`);

      let messages = updatedText.split('\n');

      if (messages.length > MAX_MESSAGES) {
        while (messages.length > MAX_MESSAGES) {
          const oldestMessage = messages.shift(); // Remove the oldest single message
          fs.appendFileSync(longTerm, `${oldestMessage}\n`); // Append the oldest message to long-term memory
        }
      }

      fs.writeFileSync(tmemory, messages.join('\n'));

      for await (const mes of client.send_message(poe_settings.bot, `${permanentText}\n${updatedText}\n${instructionsText}`)) {
        reply = mes.text;
      }

      reply = formatReplyText(reply);
      bot.sendMessage(chat_id, reply, { parse_mode: 'HTML' });
      fs.appendFileSync(tmemory, `Sara : ${reply}\n`);
    }
  }
}

async function main() {
  const client = await initPOEClient();

  bot.on('message', (message) => {
    handleIncomingMessage(client, message.chat.id, message);
  });

  console.log('Telegram bot has started!');
}

main().catch((error) => {
  console.error('Error starting the bot:', error);
});
