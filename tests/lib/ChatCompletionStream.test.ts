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
    var capturedLogProbs: ChatCompletionTokenLogprob[] | undefined;

    const stream = (
      await makeStreamSnapshotRequest((openai) =>
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
      )
    ).on('logprobs.content.done', (props) => {
      if (!capturedLogProbs?.length) {
        capturedLogProbs = props.content;
      }
    });

    const choice = (await stream.finalChatCompletion()).choices[0];
    expect(choice).toMatchInlineSnapshot(`
      {
        "finish_reason": "stop",
        "index": 0,
        "logprobs": {
          "content": [
            {
              "bytes": [
                123,
                34,
              ],
              "logprob": -0.0056217043,
              "token": "{"",
              "top_logprobs": [],
            },
            {
              "bytes": [
                99,
                105,
                116,
                121,
              ],
              "logprob": -0.000003650519,
              "token": "city",
              "top_logprobs": [],
            },
            {
              "bytes": [
                34,
                58,
                34,
              ],
              "logprob": -0.0001006823,
              "token": "":"",
              "top_logprobs": [],
            },
            {
              "bytes": [
                83,
                97,
                110,
              ],
              "logprob": -0.01311223,
              "token": "San",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                70,
                114,
                97,
                110,
                99,
                105,
                115,
                99,
                111,
              ],
              "logprob": -0.000041318875,
              "token": " Francisco",
              "top_logprobs": [],
            },
            {
              "bytes": [
                34,
                44,
                34,
              ],
              "logprob": -0.048770856,
              "token": "","",
              "top_logprobs": [],
            },
            {
              "bytes": [
                117,
                110,
                105,
                116,
                115,
              ],
              "logprob": -3.1281633e-7,
              "token": "units",
              "top_logprobs": [],
            },
            {
              "bytes": [
                34,
                58,
                34,
              ],
              "logprob": -0.000035477897,
              "token": "":"",
              "top_logprobs": [],
            },
            {
              "bytes": [
                102,
              ],
              "logprob": -0.52312326,
              "token": "f",
              "top_logprobs": [],
            },
            {
              "bytes": [
                34,
                125,
              ],
              "logprob": -0.000043464544,
              "token": ""}",
              "top_logprobs": [],
            },
          ],
          "refusal": null,
        },
        "message": {
          "content": "{"city":"San Francisco","units":"f"}",
          "parsed": {
            "city": "San Francisco",
            "units": "f",
          },
          "refusal": null,
          "role": "assistant",
          "tool_calls": [],
        },
      }
    `);
    expect(capturedLogProbs?.length).toEqual(choice?.logprobs?.content?.length);
  });

  it('emits refusal logprobs events', async () => {
    var capturedLogProbs: ChatCompletionTokenLogprob[] | undefined;

    const stream = (
      await makeStreamSnapshotRequest((openai) =>
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
      )
    ).on('logprobs.refusal.done', (props) => {
      if (!capturedLogProbs?.length) {
        capturedLogProbs = props.refusal;
      }
    });

    const choice = (await stream.finalChatCompletion()).choices[0];
    expect(choice).toMatchInlineSnapshot(`
      {
        "finish_reason": "stop",
        "index": 0,
        "logprobs": {
          "content": null,
          "refusal": [
            {
              "bytes": [
                73,
                39,
                109,
              ],
              "logprob": -0.0012596374,
              "token": "I'm",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                118,
                101,
                114,
                121,
              ],
              "logprob": -0.4733233,
              "token": " very",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                115,
                111,
                114,
                114,
                121,
              ],
              "logprob": -0.000008776276,
              "token": " sorry",
              "top_logprobs": [],
            },
            {
              "bytes": [
                44,
              ],
              "logprob": -0.000056219335,
              "token": ",",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                98,
                117,
                116,
              ],
              "logprob": -0.029764498,
              "token": " but",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                73,
              ],
              "logprob": -0.0029132885,
              "token": " I",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                99,
                97,
                110,
                39,
                116,
              ],
              "logprob": -0.00812113,
              "token": " can't",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                97,
                115,
                115,
                105,
                115,
                116,
              ],
              "logprob": -0.0032810946,
              "token": " assist",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                119,
                105,
                116,
                104,
              ],
              "logprob": -0.0040882546,
              "token": " with",
              "top_logprobs": [],
            },
            {
              "bytes": [
                32,
                116,
                104,
                97,
                116,
              ],
              "logprob": -0.002152523,
              "token": " that",
              "top_logprobs": [],
            },
            {
              "bytes": [
                46,
              ],
              "logprob": -0.28175527,
              "token": ".",
              "top_logprobs": [],
            },
          ],
        },
        "message": {
          "content": null,
          "parsed": null,
          "refusal": "I'm very sorry, but I can't assist with that.",
          "role": "assistant",
          "tool_calls": [],
        },
      }
    `);
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
        "message": {
          "content": null,
          "role": "assistant",
          "audio": {
            "id": "audio-123",
            "data": "base64audio...",
            "expires_at": 1704805200,
            "transcript": "Hello, this is a test response."
          }
        }
      }
    `);
  }, 60000);
});
