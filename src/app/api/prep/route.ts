import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, HeaderUtils, Message as SdkMessage } from 'coze-coding-dev-sdk';
import {
  buildStagePrompt,
  extractJsonBlock,
  isPrepStage,
  type CourseInfo,
  type StageOutputs,
} from '@/lib/prep-stages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PrepAnalysisRequest extends CourseInfo {
  mode: string;
  /** 已完成阶段成果，作为备课上下文注入提示词（阶段间信息传递） */
  priorOutputs?: StageOutputs;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PrepAnalysisRequest;
    const { subject, grade, chapter, knowledgePoints, mode, priorOutputs } = body;

    if (!chapter || !knowledgePoints || knowledgePoints.length === 0) {
      return NextResponse.json(
        { error: 'chapter and knowledgePoints are required' },
        { status: 400 }
      );
    }
    if (!isPrepStage(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const messages: SdkMessage[] = buildStagePrompt(
      mode,
      { subject, grade, chapter, knowledgePoints },
      priorOutputs
    );

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(undefined, customHeaders);

    // 流式响应：逐块推送 content，done 帧附带完整文本与服务端提取的结构化摘要
    const encoder = new TextEncoder();
    const streamData = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          for await (const chunk of client.stream(messages)) {
            if (chunk.content) {
              fullContent += chunk.content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
              );
            }
          }
          const structured = extractJsonBlock(fullContent) ?? undefined;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, result: fullContent, structured })}\n\n`)
          );
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(streamData, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Prep API error:', error);
    return NextResponse.json(
      { error: 'Failed to process prep request', details: String(error) },
      { status: 500 }
    );
  }
}
