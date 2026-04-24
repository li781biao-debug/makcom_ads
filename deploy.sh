#!/bin/bash
# ==============================================
# Makcom Ads - 阿里云部署脚本
# ==============================================
set -e

APP_DIR="/opt/makcom_ads"
REPO_URL=""  # 填入你的 Git 仓库地址

echo "=========================================="
echo "  Makcom Ads 部署脚本"
echo "=========================================="

# --- 1. 系统依赖 ---
install_docker() {
    if command -v docker &> /dev/null; then
        echo "[OK] Docker 已安装"
        return
    fi
    echo "[*] 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "[OK] Docker 安装完成"
}

install_docker_compose() {
    if docker compose version &> /dev/null; then
        echo "[OK] Docker Compose 已安装"
        return
    fi
    echo "[*] 安装 Docker Compose..."
    apt-get update && apt-get install -y docker-compose-plugin
    echo "[OK] Docker Compose 安装完成"
}

install_git() {
    if command -v git &> /dev/null; then
        echo "[OK] Git 已安装"
        return
    fi
    echo "[*] 安装 Git..."
    apt-get update && apt-get install -y git
    echo "[OK] Git 安装完成"
}

# --- 2. 项目部署 ---
setup_project() {
    if [ -d "$APP_DIR" ]; then
        echo "[*] 更新代码..."
        cd "$APP_DIR"
        git pull
    else
        echo "[*] 克隆项目..."
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
}

setup_env() {
    if [ ! -f "$APP_DIR/.env.production" ]; then
        echo "[!] 未找到 .env.production 文件"
        echo "[*] 从模板创建..."
        cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.production"
        echo ""
        echo "=========================================="
        echo "  请编辑 .env.production 填入真实配置："
        echo "  nano $APP_DIR/.env.production"
        echo "=========================================="
        echo ""
        echo "必须修改的配置项："
        echo "  - DATABASE_URL 中的密码"
        echo "  - MYSQL_ROOT_PASSWORD（与上面保持一致）"
        echo "  - AUTH_SECRET（运行 openssl rand -base64 32 生成）"
        echo "  - AUTH_URL（改为你的服务器 IP）"
        echo "  - APP_BASE_URL（改为你的服务器 IP）"
        echo "  - MAKE_* 相关的 webhook 地址"
        echo ""
        read -p "编辑完成后按回车继续..."
    else
        echo "[OK] .env.production 已存在"
    fi
}

# --- 3. 构建和启动 ---
build_and_start() {
    cd "$APP_DIR"
    echo "[*] 构建并启动容器..."
    docker compose build --no-cache
    docker compose up -d
    echo ""
    echo "[OK] 部署完成！"
    echo ""
    docker compose ps
}

# --- 4. 防火墙 ---
setup_firewall() {
    echo "[*] 配置防火墙（开放 80 端口）..."
    if command -v ufw &> /dev/null; then
        ufw allow 80/tcp
        ufw allow 22/tcp
        echo "[OK] UFW 防火墙已配置"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --reload
        echo "[OK] Firewalld 防火墙已配置"
    else
        echo "[!] 未检测到防火墙工具，请手动开放 80 端口"
    fi
    echo "[!] 请同时在阿里云控制台 -> 安全组中开放 80 端口"
}

# --- 主流程 ---
main() {
    echo ""
    install_docker
    install_docker_compose
    install_git
    echo ""
    setup_project
    setup_env
    setup_firewall
    build_and_start
    echo ""
    echo "=========================================="
    echo "  访问地址: http://$(curl -s ifconfig.me)"
    echo "=========================================="
}

main
