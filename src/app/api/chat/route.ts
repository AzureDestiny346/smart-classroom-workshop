import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Message, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { messages, stream = true } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(undefined, customHeaders);

    // LLM_MODEL 可在 .env.local 覆盖默认模型（端点与模型需配套，如 DashScope + qwen-plus）
    const llmConfig = process.env.LLM_MODEL ? { model: process.env.LLM_MODEL } : undefined;

    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;

    // 构建数学教育领域的系统提示词
    const systemPrompt = `你是智课工坊的AI备课助手，一位具有10年以上教学经验的资深数学教师。

## 你的专长
1. 精通中学数学教学，包括代数、几何、三角函数、微积分入门等
2. 熟悉ADDIE教学设计模型，能够提供完整的教学设计方案
3. 擅长设计分层练习，能够根据学生水平调整难度
4. 了解学生常见错误，能够进行精准的学情分析

## 回复要求
1. 使用Markdown格式组织内容
2. 数学公式使用LaTeX格式
3. 回答要专业、准确、实用
4. 对于复杂问题，提供多个方案供选择
5. 适当使用表格、列表等增强可读性

## 你的使命
帮助教师（尤其是新手教师）提升备课效率，提供专业的教学设计建议，让每一堂数学课都更加精彩。`;

    // 构建消息列表
    const chatMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(0, -1).map((m: { role: string; content: string }) => ({ 
        role: m.role as 'user' | 'assistant', 
        content: m.content 
      })),
      { role: 'user', content: userMessage },
    ];

    if (stream) {
      // 流式响应
      const encoder = new TextEncoder();
      const streamData = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of client.stream(chatMessages, llmConfig)) {
              if (chunk.content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          } catch (error) {
            // 以错误帧收尾而非掐断流：前端能给出明确提示而不是静默空白
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用，请稍后重试' })}\n\n`)
            );
            console.error('Chat stream error:', error);
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
    } else {
      // 非流式响应
      const result = await client.invoke(chatMessages, llmConfig);
      return NextResponse.json({
        content: result?.content || '',
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: String(error) },
      { status: 500 }
    );
  }
}
