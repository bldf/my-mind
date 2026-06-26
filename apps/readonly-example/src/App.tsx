import { applyLayoutResult, asDocumentId, asNodeId, createNode, simpleTreeLayout, type MindMapDocument, type MindMapNode, type NodeId, type NodeStyle } from "@my-mind-node/core";
import { MindMapViewer } from "@my-mind-node/react";
import "@my-mind-node/react/styles.css";
import "./styles.css";

interface DemoTreeNode {
  id: string;
  title: string;
  children?: DemoTreeNode[];
  metadata?: Record<string, unknown>;
  style?: NodeStyle;
}

const ROOT_NODE: DemoTreeNode = {
  id: "root",
  title: "AI全栈工程师-开篇",
  metadata: { nodeWidth: 340 },
  style: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
    color: "#111827",
    fontWeight: "bold",
  },
  children: [
    {
      id: "ai-tools",
      title: "AI工具",
      children: [
        {
          id: "openai",
          title: "OpenAI",
          children: [
            {
              id: "openai-agents",
              title: "agents客户端",
              children: [{ id: "openai-chatgpt", title: "CHATGPT" }],
            },
            { id: "openai-video", title: "视频", children: [{ id: "openai-sora", title: "SORA" }] },
            {
              id: "openai-browser",
              title: "浏览器",
              children: [{ id: "openai-atlas", title: "ATLAS" }],
            },
            {
              id: "openai-terminal",
              title: "终端",
              children: [{ id: "openai-codex-cli", title: "codex cli" }],
            },
            {
              id: "openai-coding",
              title: "编程",
              children: [{ id: "openai-codex", title: "codex" }],
            },
            { id: "openai-ide", title: "IDE", children: [{ id: "openai-unknown", title: "?" }] },
            {
              id: "openai-vscode",
              title: "vscode",
              children: [{ id: "openai-plugin", title: "插件" }],
            },
            {
              id: "openai-mcp",
              title: "MCP",
              children: [{ id: "openai-link-chrome", title: "链接chrome" }],
            },
            { id: "openai-gpt55", title: "gpt5.5" },
          ],
        },
        {
          id: "google",
          title: "Google",
          children: [
            { id: "google-chrome-dev-mcp", title: "chrome-dev-mcp" },
            { id: "google-antigravity", title: "Antigravity" },
            {
              id: "google-antigravity-ide",
              title: "Antigravity IDE",
              children: [
                { id: "google-control-chrome", title: "控制chrome" },
                { id: "google-frontend-style", title: "前端样式" },
              ],
            },
            {
              id: "google-web",
              title: "网页版",
              children: [{ id: "google-aistudio", title: "https://aistudio.google.com/" }],
            },
            {
              id: "google-chrome",
              title: "chrome",
              children: [{ id: "google-ask-gemini", title: "Ask gemini" }],
            },
            { id: "google-gemiapp", title: "gemiapp" },
            { id: "google-gemini-cli", title: "Geimini cli" },
          ],
        },
        {
          id: "anthropic",
          title: "Anthropic",
          children: [
            { id: "anthropic-claude-app", title: "Claude App" },
            { id: "anthropic-chrome", title: "chrome" },
            { id: "anthropic-vscode", title: "VSCODE" },
            { id: "anthropic-opus48", title: "opus4.8" },
            { id: "anthropic-sonnet", title: "Sonnet" },
          ],
        },
        { id: "ai-price-down", title: "降低" },
        {
          id: "grok",
          title: "GROK",
          children: [
            {
              id: "grok-video",
              title: "视频",
              children: [{ id: "grok-seedance", title: "seedance" }],
            },
            { id: "grok-220k", title: "22万" },
          ],
        },
      ],
    },
    {
      id: "ai-fullstack",
      title: "AI全栈开篇",
      children: [
        {
          id: "processon-link",
          title: "https://www.processon.com/view/link/62e77f4f7d9c08072e6eea09",
          metadata: { nodeWidth: 230 },
        },
      ],
    },
    {
      id: "world",
      title: "世界那么大",
      children: [
        {
          id: "sim-card",
          title: "手机卡",
          children: [
            {
              id: "esim",
              title: "eSIM",
              children: [
                { id: "esim-12mini", title: "12mini美版" },
                { id: "esim-17promax", title: "17promax 港版本" },
                { id: "esim-korean", title: "韩版" },
                {
                  id: "esim-number",
                  title: "号（上网）、没号（上网）",
                  metadata: { nodeWidth: 206 },
                },
                {
                  id: "esim-plan",
                  title: "15$ 1个月",
                  children: [{ id: "esim-plan-4g", title: "4g" }],
                },
                {
                  id: "channels",
                  title: "渠道",
                  children: [
                    {
                      id: "iphone-classmate",
                      title: "iPhone同学",
                      children: [
                        { id: "iphone-tello", title: "https://tello.com/" },
                        { id: "iphone-giffgaff", title: "https://www.giffgaff.com/" },
                        { id: "iphone-saily", title: "Saily" },
                        { id: "iphone-redteago", title: "redteago" },
                      ],
                    },
                    {
                      id: "no-phone",
                      title: "没有手机",
                      children: [
                        {
                          id: "no-phone-cheap",
                          title: "便宜",
                          children: [{ id: "fanytel", title: "https://webdialer.fanytel.com/phone-numbers" }],
                        },
                        {
                          id: "no-phone-api",
                          title: "Api",
                          children: [
                            {
                              id: "textverified",
                              title: "https://www.textverified.com/app/credits/card",
                            },
                          ],
                        },
                        {
                          id: "no-phone-temp",
                          title: "临时",
                          children: [{ id: "hero-sms", title: "http://hero-sms.com/cn/services" }],
                        },
                        {
                          id: "yibotong",
                          title: "易博通",
                          children: [
                            { id: "virtual-number", title: "虚拟号注册" },
                            {
                              id: "hk-region",
                              title: "港区",
                              children: [
                                { id: "telegram", title: "telegram" },
                                {
                                  id: "appleid",
                                  title: "appleid",
                                  children: [
                                    { id: "appleid-us", title: "美区" },
                                    { id: "appleid-login-warning", title: "别再设置里登录" },
                                  ],
                                },
                              ],
                            },
                            { id: "us-region", title: "美区" },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "ip",
          title: "IP",
          children: [
            { id: "ip-tun", title: "tun模式" },
            { id: "ip-rules", title: "规则" },
            {
              id: "ip-home-bandwidth",
              title: "家庭带宽",
              children: [
                {
                  id: "ip-buildable",
                  title: "完全可以搭建",
                  children: [{ id: "aws", title: "AWS" }],
                },
              ],
            },
            {
              id: "tagss",
              title: "https://tagss.pro/#!/auth/G8pEi6xM",
              metadata: { nodeWidth: 210 },
            },
            { id: "ping0", title: "ping0.cc" },
            {
              id: "kendeji",
              title: "https://kendeji.io/#!/auth?invite=uuYIp5DE",
              metadata: { nodeWidth: 216 },
            },
            {
              id: "mole666",
              title: "https://www.mole666.xyz/aff.php?aff=3238",
              metadata: { nodeWidth: 220 },
              children: [
                {
                  id: "netten66",
                  title: "https://www.netten66.com/aff.php?aff=2",
                  metadata: { nodeWidth: 224 },
                },
              ],
            },
          ],
        },
        {
          id: "payment",
          title: "支付",
          children: [
            {
              id: "roogooo",
              title: "roogooo",
              children: [
                {
                  id: "roogooo-url",
                  title: "https://wap.roogoo.shop/register?inviteCode=pvnuk5",
                  metadata: { nodeWidth: 240 },
                },
              ],
            },
            { id: "bybit-card", title: "Bybit card" },
          ],
        },
        {
          id: "mac",
          title: "MAC",
          children: [{ id: "m-chip", title: "M芯片", children: [{ id: "recycle", title: "免费回收" }] }],
        },
        {
          id: "passport",
          title: "护照、港澳通行证",
          children: [{ id: "hk-bank-card", title: "香港银行卡" }],
        },
      ],
    },
  ],
};

function collectNodes(treeNode: DemoTreeNode, parentId: NodeId | null, nodes: MindMapDocument["nodes"]): NodeId {
  const nodeId = asNodeId(treeNode.id);
  const childIds = (treeNode.children ?? []).map((child) => asNodeId(child.id));
  nodes[nodeId] = createNode({
    id: nodeId,
    parentId,
    children: childIds,
    title: treeNode.title,
    style: treeNode.style,
    metadata: treeNode.metadata,
  });
  for (const child of treeNode.children ?? []) collectNodes(child, nodeId, nodes);
  return nodeId;
}

function createReadonlyDemoDocument(): MindMapDocument {
  const nodes: MindMapDocument["nodes"] = {};
  const rootId = collectNodes(ROOT_NODE, null, nodes);
  const document: MindMapDocument = {
    schemaVersion: "1.0",
    id: asDocumentId("readonly-demo"),
    title: "AI全栈工程师-开篇",
    rootId,
    nodes,
    connections: [],
    tags: [],
    theme: {
      id: "readonly-demo",
      name: "Readonly demo",
      mode: "light",
      colors: {
        canvas: "#eeeeef",
        node: "#ffffff",
        nodeText: "#111827",
        edge: "#bfc6d1",
        selected: "#2563eb",
        accent: "#0f766e",
      },
    },
    layout: {
      direction: "right",
      gapX: 220,
      gapY: 98,
    },
    revision: 0,
    metadata: {},
  };

  return applyLayoutResult(document, simpleTreeLayout(document));
}

const demoDocument = createReadonlyDemoDocument();

function renderDemoNode(node: MindMapNode) {
  if (node.parentId === null) {
    return (
      <div className="readonly-demo-logo">
        <strong>AI全栈工程师-开篇</strong>
      </div>
    );
  }

  return <span className="mmn-node__title mmn-node__title--readonly">{node.title}</span>;
}

export default function App() {
  return (
    <main className="readonly-demo">
      <MindMapViewer
        value={demoDocument}
        height="100vh"
        className="readonly-demo__map"
        breadcrumbs={{ hidden: true }}
        toolbar={{ hidden: true }}
        inspector={{ hidden: true }}
        search={{ hidden: true }}
        renderNode={renderDemoNode}
      />
    </main>
  );
}
