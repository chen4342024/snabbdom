
// 操作DOM结果的API
export interface DOMAPI {
  createElement: (tagName: any) => HTMLElement;
  createElementNS: (namespaceURI: string, qualifiedName: string) => Element;
  createTextNode: (text: string) => Text;
  createComment: (text: string) => Comment;
  insertBefore: (parentNode: Node, newNode: Node, referenceNode: Node | null) => void;
  removeChild: (node: Node, child: Node) => void;
  appendChild: (node: Node, child: Node) => void;
  parentNode: (node: Node) => Node;
  nextSibling: (node: Node) => Node;
  tagName: (elm: Element) => string;
  setTextContent: (node: Node, text: string | null) => void;
  getTextContent: (node: Node) => string | null;
  isElement: (node: Node) => node is Element;
  isText: (node: Node) => node is Text;
  isComment: (node: Node) => node is Comment;
}

// 创建元素
function createElement(tagName: any): HTMLElement {
  return document.createElement(tagName);
}

// 创建具有命名空间的元素
function createElementNS(namespaceURI: string, qualifiedName: string): Element {
  return document.createElementNS(namespaceURI, qualifiedName);
}

// 创建文本节点
function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

// 创建注释元素
function createComment(text: string): Comment {
  return document.createComment(text);
}

// 插入节点到新的节点前面
function insertBefore(parentNode: Node, newNode: Node, referenceNode: Node | null): void {
  parentNode.insertBefore(newNode, referenceNode);
}

// 删除子节点
function removeChild(node: Node, child: Node): void {
  node.removeChild(child);
}

// 追加子节点
function appendChild(node: Node, child: Node): void {
  node.appendChild(child);
}

// 获取父级节点
function parentNode(node: Node): Node | null {
  return node.parentNode;
}

//获取相邻节点
function nextSibling(node: Node): Node | null {
  return node.nextSibling;
}

// 获取标签名字
function tagName(elm: Element): string {
  return elm.tagName;
}

// 设置文本内容
function setTextContent(node: Node, text: string | null): void {
  node.textContent = text;
}

// 获取文本内容
function getTextContent(node: Node): string | null {
  return node.textContent;
}

// 是否是元素类型
function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

// 是否是文本类型
function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

// 是否是注释内容
function isComment(node: Node): node is Comment {
  return node.nodeType === 8;
}

export const htmlDomApi = {
  createElement,
  createElementNS,
  createTextNode,
  createComment,
  insertBefore,
  removeChild,
  appendChild,
  parentNode,
  nextSibling,
  tagName,
  setTextContent,
  getTextContent,
  isElement,
  isText,
  isComment,
} as DOMAPI;

export default htmlDomApi;
