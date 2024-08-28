# Doker常用命令

## Docker 安装

```shell
# 卸载服务器上旧的版本
yum remove dokcer \
		docker-client \
		docker-client-latest \
		docker-common \
		docker-latest \
		docker-latest-logrotate \
		docker-logrotate \
		docker-engine

# 安装docker需要的安装包
yum install -y yum-utils

# 设置镜像仓库，采用阿里云的
yum-config-manager \
    --add-repo \
    https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 更新yun软件包索引
yum makecache fast
# 上面的执行不了用这个也可以
yum makecache

# 安装dokcer相关的源
yum install docker-ce docker-ce-cli containerd.io

# 启动docker
systemctl start docker

# 验证，输出docker的相关信息即可
docker version

# 官网例子
docker run hello-world

# 关闭docker
systemctl stop docker

# 重启docker
systemctl restart docker

# 卸载docker
# 1、卸载依赖
yun remove docker-ce docker-ce-cli containerd.io
# 2、卸载资源 /usr/lib/docker 是docker的默认资源路径
rm -rf /var/lib/docker
```

## 阿里云镜像加速

使用自己的阿里云账号登录阿里云，找到`容器镜像服务`，进入后在「镜像工具」-「镜像加速器」中可以看到加速器地址以及各平台的操作文档

![image-20211202154952437](https://file.iamwx.cn/images/202204121748502.png)

配置使用

```shell
# 创建目录
sudo mkdir -p /etc/docker
# 创建配置文件
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://yd7zmnct.mirror.aliyuncs.com"]
}
EOF
# 加载配置文件
sudo systemctl daemon-reload
# 重启docker
sudo systemctl restart docker
```

## Docker 常用命令

### 帮助命令

```shell
# 查看Docker版本信息
docker version
# 查看Docker的系统信息，包含镜像和容器的数量
docker info
# 帮助命令，自行学习使用
docker --help
```

Docker 官方文档地址：https://docs.docker.com

### 镜像常用命令

```shell
# 查看所有镜像
docker images
# REPOSITORY-镜像源 TAG-标签，版本 IMAGE ID-镜像的id CREATED-镜像创建时间 SIZE-镜像大小
```

![image-20211211125015455](https://file.iamwx.cn/images/202204121748494.png)

```shell
# 列出镜像列表详细信息
docker images -a
# 列出镜像的id列表
docker images -q
```

```shell
# 搜索镜像命令
docker search nginx
```

![image-20211211125725696](https://file.iamwx.cn/images/202204121748611.png)

```shell
# 下载镜像：会默认下载最新的
docker pull nginx
# 指定需要的版本进行下载，需要注意tab在docker hub上一定要存在
docker pull nginx:1.17.0
```

```shell
# 删除镜像，可以根据镜像id或者镜像名进行删除
docker rmi -f IMAGE_ID
docker rmi -f IMAGE_NAME
# 遍历删除所有镜像
docker rmi -f $(docker images -aq)
```

```shell
# 导出镜像到本地，格式：docker save > FILE_NAME.tar IMAGE_NAME:TAG
docker save -o demo.tar demo:1.0.0

# 加载tar到docker容器中
docker load < demo.tar

# 清除无用的镜像
docker image prune -a
# -a, --all: 删除所有没有用的镜像，而不仅仅是临时文件
# -f, --force：强制删除镜像文件，无需弹出提示确认
```

```shell
# 修改镜像名称
# docker tag [镜像ID] [新镜像名称]:[新镜像版本]
docker tag xxxx new_image_name:latest
```

### 容器常用命令

> 有了镜像才可以创建容器

```shell
# 拉取镜像
docker pull centos
# 新建容器并启动
docker run -it centos
```

参数说明

--name    指定容器名称，用来区分容器

-d 			后台方式运行

-it 			交互方式运行，可进入容器查看内容

-p			 指定容器的端口，如： -p 8080:8080，指定端口可以有一下几种方式

​				 -p ip:主机端口:容器端口

​				 -p 主机端口:容器端口（常用）

​				 -p 容器端口

-P			 随机指定端口

```shell
# 列出所有在运行的容器
docker ps

# 列出所有容器
docker ps -a

# 列出所有容器id
docker ps -aq

# 启动已有容器
docker start 容器id

# 停止容器
docker stop 容器id

# 强制停止容器
docker kill 容器id

# 重启容器
docker restart 容器id

# 删除指定容器
docker rm 容器id

# 删除所有容器
docker rm -f $(docker ps -aq)
docker ps -a -q|xargs docker rm
```

### 常用其它命令

```shell
# 查看容器运行日志
docker logs -f 容器id
# --tf 					显示日志
# --tail number 要显示的日志条数，不设置时自动加载

# 查看容器中的进程
docker top 容器id

# 查看容器的元数据
docker inspect 容器id

# 进入容器
# 方式一：进入容器后开启一个新的终端，可以在里面执行指令操作（常用）
docker exec -it /bin/bash
# 方式二：进入容器中正在执行的终端，不会启动新的进程
docker attach 容器id

# 从容器内拷贝文件到宿主机上
docker cp 容器id:/容器中的路径/容器中的文件 宿主机的目录
# 如；docker cp asdfeesdf:/home/test.java /home

# 清除未启动的容器
docker rm `docker ps -a|grep Exited|awk '{print $1}'`

# 清除所有
```

## Docker 空悬镜像

build新的镜像出来，之前的镜像会变成`<none>`镜像，已经是没有用了的镜像，可以删除掉。

删除空悬镜像

```shell
docker rmi $(docker images -f "dangling=true" -q)
```

## 容器数据卷

### 挂载数据卷

> 挂载的意义，防止容器被删除时，所以数据都被清除，挂载到宿主机，删除容器，数据还是存在的

```shell
# 启动容器时，挂载容器内目录
docker run -d -p 3306:3306 -v /houme/mysql/conf:/etc/mysql/conf.d -v /home/mysql/data:/var/lib/mysql
```

/houme/mysql/conf  本地指定的my.cnf的路径

/etc/mysql/conf.d  容器内的配置文件路径

/home/mysql/data 本地指定存储mysql的数据的路径

/var/lib/mysql 容器内mysql的数据存储路径

### 匿名挂载

```shell
docker run -d -P --name nginx-01 -v /etc/nginx nginx
# 此时 -v 后面只有容器内的路径，此时就是匿名挂载
```

### 具名挂载

```shell
docker run -d -P --name nginx-02 -v juming-nginx:/etc/nginx nginx
# 此时 -v 后面是不是以/开头的，此时是具名挂载，通过下面的命令，可看到具名挂载的列表
docker volume ls
```

### 挂载方式区分

-v 容器内路径						 匿名挂载

-v 卷名:容器内路径			    具名挂载

-v /宿主机路径:容器内路径	指定路径挂载

> 在容器内路径后面跟上 :ro(说明这个路径只能从宿主机操作，容器内部无法操作)，:rw（可读可写）

### 数据卷容器

多个容器是可以共用一个挂载，以此多个容器做到数据共享。

## DockerFile

Dockerfile 是用来构建docker镜像的构建文件，文件是由命令脚本组成

构建步骤：

1、编写一个dockerfile文件

2、docker build 构建成为一个镜像

3、docker run 运行镜像

4、docker push 发布镜像（DockerHub、阿里云镜像仓库等）

### Dockerfile指令说明

```shell
FROM          # 基础镜像层，在这个镜像基础上进行
MAINTAINER    # 镜像的作者，姓名+邮箱
RUN 					# 镜像构建时需要运行的命令
ADD						# 复制文件到容器中
WORKDIR				# 镜像的工作目录
VOLUME				# 设置卷，挂载主机目录
EXPOSE				# 指定暴露端口
CMD						# 指定容器启动时候验运行的命令，只有最后一个会生效，可被替代
ENTRPOINT			# 指定容器启动时候验运行的命令，可以追加命令
ONBUILD				# 当构建一个被继承Dockerfile，这个时候会触发ONBUILD的指令
COPY					# 类似ADD命令，将文件拷贝到镜像中
ENV						# 构建的时候设置环境变量
```

构建自己的centos

```shell
# 创建dockerfile文件
vim mydockerfile-centos

# 编写内容
FROM centos
MAINTAINER wangx iamwx@foxmail.com

ENV MYPATH /usr/local
WORKDIR $MYPATH

RUN yum -y install vim
RUN yum -y install net-tools

EXPOSE 80

CMD echo $MYPATH
CMD echo "------ end ------"
CMD /bin/bash

# 构建自己的镜像
docker build -f /path/mydockerfile-centos -t wangx/centos:1.0

# 运行
docker run -it -d wangx/centos:1.0

# 查看镜像构建的历史
docker history 镜像id
```

## Docker 网络

### 网络模式

bridge：桥接模式，默认的

host：和宿主机共享网络

none：不配置网络

container：容器网络联通（用得少，局限大）

### 自定义网络

```shell
# 查看网络的指令帮助文档
docker network --help
```

![image-20211202180515408](https://file.iamwx.cn/images/202204121749797.png)

connect：连接容器到另一个网络

create：自定义网络

disconnect：让容器从一个网络中断连

inspect：显示一个或多个网络上的详细信息，在后面加上容器名称或容器id即可查看

ls：列出所有网络

prune：删除所有未使用的网络

rm：删除指定网络

创建网络执行示例

```shell
docker network create --driver bridge --subnet 192.168.1.0/16 --gateway 192.168.1.1 mynet
```

--driver 指定使用bridge模式

--subnet 设置子网，支持的ip范围将会是 192.168.1.2~192.168.255.255

--gateway 设置网关

mynet 自定义的网络名称

![image-20211202181534610](https://file.iamwx.cn/images/202204121749260.png)

## 打包镜像

```shell
# -t 后面是镜像名称，后面是版本号，-f 指定文件， 最后的点是指定当前目录下
docker build -t wangx1013/openjdk8-agent:1.0 -f Dockerfile .

# 查看镜像
wangx@axing jdk8-agent % docker images
REPOSITORY                 TAG       IMAGE ID       CREATED        SIZE
wangx1013/openjdk8-agent   1.0     899346e080aa   4 months ago   306MB
```

##  推送镜像到镜像仓库

> 以阿里云为例

```shell
# 首先进行登录
docker login --username=iamwx1013 registry.cn-hangzhou.aliyuncs.com --password=<password>

# 登录成功
Login Succeeded

# 打一个tag
docker tag 899346e080aa registry.cn-hangzhou.aliyuncs.com/wxstudyk8s/openjdk8-agent:1.0
# 推到镜像仓库
docker push registry.cn-hangzhou.aliyuncs.com/wxstudyk8s/openjdk8-agent:1.0
```

通过以上步骤即可在阿里云镜像查看到镜像