# Docker Compose常用命令

## 一、Docker Compose 安装

```shell
# 1、下载文件，使用的是国内镜像
curl -L https://get.daocloud.io/docker/compose/releases/download/1.25.5/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose

# 2、进行授权
chmod +x /usr/local/bin/docker-compose

# 3、查看版本
[root@localhost /]# docker-compose version
docker-compose version 1.25.5, build 8a1c60f6
docker-py version: 4.1.0
CPython version: 3.7.5
OpenSSL version: OpenSSL 1.1.0l  10 Sep 2019
```

## 二、docker-compose.yml 文件规则

以搭建WordPress网站

```yaml
# 版本，对应https://docs.docker.com/compose/compose-file/compose-file-v3/
version: "3.3"
# 服务列表
services:
	# 服务配置，配置项：https://docs.docker.com/compose/compose-file/compose-file-v3/#service-configuration-reference
    # 第一部分: Building(构建镜像)
     web:
       # 使用当前目录下的Dockerfile
       build: .
       args: # 增加额外参数
         APP_HOME: app
       volumes: # 目录挂载，宿主机在前，容器在后
         - .:/code
       depends_on: # 依赖db和redis
         - db
         - redis
     
       # 使用定制化的Dockerfile，指定新目录相对路径和文件名
       build:
         context: ./dir 
         dockerfile: Dockerfile.dev
         container_name: app # 自定义容器名
     
       # 基于现有镜像构建
       image: ubuntu
       image: ubuntu:14.04
       image: remote-registry:4000/postgresql
       image: bcbc65fd
     
     	# 第二部分: Ports(端口)
       ports: # 指定端口映射，HOST:Container
         - "6379" # 指定容器的端口6379，宿主机会随机映射端口
         - "8080:80"  # 宿主机端口8080，对应容器80
     
       # 暴露端口给-link或处于同一网络的容器，不暴露给宿主机。
       expose: ["3000"]
     
     # 第三部分: Environment Variables(环境变量)
       environment:
         MODE: development
         SHOW: 'true'
     
       # 等同于
       environment:
         - MODE=development
         - SHOW: 'true'
     
       # 使用环境变量.env文件
       env_file: .env
       env_file:
         - ./common.env
         - ./apps/web.env
     
     # 第四部分：commands (命令)
       # 容器启动后默认执行命令，会被docker run覆盖
       command: bundle exec thin -p 3000
       command: ['/bin/bash/', 'start.sh']
     
       # 容器启动后程序入口
       entrypoint: /code/entrypoint.sh
     
     
     # 第五部分：Networks(网络)
       networks: # 使用bridge驱动创建名为frontend的网络
         frontend:
           driver: bridge
     
       networks: # 使用创建的网络进行通信
           - frontend
     
         # 加入已经存在的外部网络
         networks: 
           default:
             external:
               name: my-pre-existing-network
     
     # 第六部分：Volumes(数据卷)
       volumes: # 创建名为postgres_data的数据卷
         postgres_data:

         db:
           image: postgres:latest
           volumes:
             - postgres_data:/var/lib/postgresql/data
 
 # 第七部分：External Links(外部链接)
 # 目的是让Compose能够连接那些不在docker-compose.yml中定义的单独运行容器
   services:
     web:
       external_links:
         - redis_1
         - project_db_1:mysql
```

## 三、docker-compose 命令

```shell
# 默认使用docker-compose.yml构建镜像
docker-compose build
docker-compose build --no-cache # 不带缓存的构建

# 指定不同yml文件模板用于构建镜像
docker-compose build -f docker-compose1.yml

# 列出Compose文件构建的镜像
docker-compose images                          

# 启动所有编排容器服务
docker-compose up -d

# 查看正在运行中的容器
docker-compose ps 

# 查看所有编排容器，包括已停止的容器
docker-compose ps -a

# 进入指定容器执行命令
docker-compose exec nginx bash 
docker-compose exec web python manage.py migrate --noinput

# 查看web容器的实时日志
docker-compose logs -f web

# 停止所有up命令启动的容器
docker-compose down 

# 停止所有up命令启动的容器,并移除数据卷
docker-compose down -v

# 重新启动停止服务的容器
docker-compose restart web

# 暂停web容器
docker-compose pause web

# 恢复web容器
docker-compose unpause web

# 删除web容器，删除前必需停止stop web容器服务
docker-compose rm web  

# 查看各个服务容器内运行的进程 
docker-compose top
```

