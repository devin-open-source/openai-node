import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionTokenLogprob } from 'openai/resources';
import { z } from 'zod';
import { makeStreamSnapshotRequest } from '../utils/mock-snapshots';

jest.setTimeout(1000 * 30);

describe('.stream()', () => {
  it('works', async () => {
    const stream = await makeStreamSnapshotRequest((openai) =>
      openai.beta.chat.completions.stream({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'user',
            content: "What's the weather like in SF?",
          },
        ],
        response_format: zodResponseFormat(
          z.object({
            city: z.string(),
            units: z.enum(['c', 'f']).default('f'),
          }),
          'location',
        ),
      }),
    );

    expect((await stream.finalChatCompletion()).choices[0]).toMatchInlineSnapshot(`
      {
        "finish_reason": "stop",
        "index": 0,
        "logprobs": null,
        "message": {
          "content": "{"city":"San Francisco","units":"c"}",
          "parsed": {
            "city": "San Francisco",
            "units": "c",
          },
          "refusal": null,
          "role": "assistant",
          "tool_calls": [],
        },
      }
    `);
  });

  it('emits content logprobs events', async () => {
    let capturedLogProbs: ChatCompletionTokenLogprob[] | undefined;
    const stream = await makeStreamSnapshotRequest((openai) =>
      openai.beta.chat.completions.stream({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'user',
            content: "What's the weather like in SF?",
          },
        ],
        logprobs: true,
        response_format: zodResponseFormat(
          z.object({
            city: z.string(),
            units: z.enum(['c', 'f']).default('f'),
          }),
          'location',
        ),
      }),
    );

    // Set up event listener before consuming the stream
    const eventPromise = new Promise<void>((resolve) => {
      stream.on('logprobs.content.done', (props) => {
        capturedLogProbs = props.content;
        resolve();
      });
    });

    // Get final completion and wait for event
    const choice = (await stream.finalChatCompletion()).choices[0];
    await eventPromise;

    expect(capturedLogProbs?.length).toEqual(choice?.logprobs?.content?.length);
  });

  it('emits refusal logprobs events', async () => {
    let capturedLogProbs: ChatCompletionTokenLogprob[] | undefined;
    const stream = await makeStreamSnapshotRequest((openai) =>
      openai.beta.chat.completions.stream({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'user',
            content: 'how do I make anthrax?',
          },
        ],
        logprobs: true,
        response_format: zodResponseFormat(
          z.object({
            city: z.string(),
            units: z.enum(['c', 'f']).default('f'),
          }),
          'location',
        ),
      }),
    );

    // Set up event listener before consuming the stream
    const eventPromise = new Promise<void>((resolve) => {
      stream.on('logprobs.refusal.done', (props) => {
        capturedLogProbs = props.refusal;
        resolve();
      });
    });

    // Get final completion and wait for event
    const choice = (await stream.finalChatCompletion()).choices[0];
    await eventPromise;

    expect(capturedLogProbs?.length).toEqual(choice?.logprobs?.refusal?.length);
  });

  it('handles audio responses with expires_at', async () => {
    const stream = await makeStreamSnapshotRequest((openai) =>
      openai.beta.chat.completions.stream({
        model: 'gpt-4o-audio-preview',
        messages: [{ role: 'user', content: 'Say something' }],
        modalities: ['text', 'audio'],
        audio: { voice: 'alloy', format: 'pcm16' },
      }),
    );

    // Collect all chunks to verify streaming behavior
    const chunks: Array<any> = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Verify the streaming response format
    const streamText = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join('\n\n');
    expect(streamText + '\n\ndata: [DONE]').toMatchSnapshot();

    // Verify the final completion
    const completion = await stream.finalChatCompletion();
    expect(completion.choices[0]).toMatchInlineSnapshot(`
      {
        "finish_reason": "stop",
        "index": 0,
        "logprobs": null,
        "message": {
          "content": null,
          "parsed": null,
          "refusal": null,
          "role": "assistant",
          "tool_calls": []
        }
      }
    `);
  }, 120000); // Increase timeout to 120 seconds
});
