import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'冒险岛怀旧服童话村',description:'把一起冒险的日子，留在童话村。',icons:{icon:'/clover.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}

