# 基于Docker安装Jenkin并部署项目

## 一、安装

### 1.1 安装Docker

点击查看笔记：[Docker安装](https://www.iamwx.cn/archives/doker%E7%AC%94%E8%AE%B0md)

### 1.2 安装Docker Compose

```shell
# 1、下载文件，使用的是国内镜像
curl -L https://get.daocloud.io/docker/compose/releases/download/1.25.5/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose

# 2、进行授权
chmod +x /usr/local/bin/docker-compose

# 3、查看版本
docker-compose version

[root@localhost /]# docker-compose version
docker-compose version 1.25.5, build 8a1c60f6
docker-py version: 4.1.0
CPython version: 3.7.5
OpenSSL version: OpenSSL 1.1.0l  10 Sep 2019
```

### 1.3 安装jenkins

```shell
# 拉取最新镜像
docker pull jenkins/jenkins

# 创建一个工作目录
cd home
mkdir jenkins
cd jenkins

# 创建 docker-compose.yml 文件
vi docker-compose.yml

# 输入以下内容
version: "3.1"
services:
  jenkins:
    image: jenkins/jenkins
    container_name: jenkins
    ports:
      - 8080:8080
      - 50000:50000
    volumes:
      - /etc/localtime:/etc/localtime
      - ./data/:/var/jenkins_home/

# 先在当前文件夹下 data 目录
mkdir data
# 授予权限，否则启动 yml 后会报错
chmod -R a+w data/

# 启动：
docker-compose up -d

```

由于jenkins需要下载大量内容，但是由于默认下载地址下载速度较慢，需要重新设置下载地址为国内镜像站

```yaml
# 修改数据卷中的hudson.model.UpdateCenter.xml文件
<?xml version='1.1' encoding='UTF-8'?>
<sites>
  <site>
    <id>default</id>
    <url>https://updates.jenkins.io/update-center.json</url>
  </site>
</sites>
# 将下载地址替换为http://mirror.esuni.jp/jenkins/updates/update-center.json
<?xml version='1.1' encoding='UTF-8'?>
<sites>
  <site>
    <id>default</id>
    <url>http://mirror.esuni.jp/jenkins/updates/update-center.json</url>
  </site>
</sites>
```

设置完后重启

```shell
docker-compose restart
```

### 1.4 配置jenkins

然后访问jenkins首页：ip:8080

> 初始密码通过查看jenkins运行日志可查看
>
> docker-compose logs -f 

![image-20220705230940507](https://file.iamwx.cn/images/202207052309537.png)

* 输入初始化密码

![image-20220705230829309](https://file.iamwx.cn/images/202207052308344.png)

* 点击选择插件来安装

![image-20211124205513465](https://file.iamwx.cn/images/202207052310560.png)

* 选择要安装的插件

![image-20211124205854418](https://file.iamwx.cn/images/202207052311014.png)

![image-20211124205858730](https://file.iamwx.cn/images/202207052311403.png)

![image-20211124205917317](https://file.iamwx.cn/images/202207052312263.png)

* 下载完毕设置信息进入首页（可能会出现下载失败的插件）

![image-20211124211635550](https://file.iamwx.cn/images/202207052313703.png)

![image-20211124211700999](https://file.iamwx.cn/images/202207052313057.png)

进入到首页

![image-20220705231350474](https://file.iamwx.cn/images/202207052313514.png)

## 二、项目准备

* 准备一个SpringBoot项目，编写一个测试接口接口

![image-20220706222456070](https://file.iamwx.cn/images/202207062224229.png)

* 将项目代码上传到Gitlab

![image-20220706222940539](https://file.iamwx.cn/images/202207062229605.png)

## 三、jenkins配置

### 3.1 创建任务

* 在jenkins上创建任务

![image-20211125163541645](https://file.iamwx.cn/images/202207062230870.png)

* 选择自由风格创建任务

![image-20220706223219993](https://file.iamwx.cn/images/202207062232053.png)

### 3.2 配置代码拉取

如果仓库是公共的，则不需要配置密码，如果是私有的，点击右侧的添加即可添加当前在Gitlab仓库使用的账号

![image-20220706224343417](https://file.iamwx.cn/images/202207062243477.png)

* 点击立即构建

![image-20220706224623878](https://file.iamwx.cn/images/202207062246951.png)

* 点击上图②后，进入下图页面，点击控制台输出，可以根据第三行日志信息，查看jenkins本地拉取到的源码

![image-20220706224759022](https://file.iamwx.cn/images/202207062247083.png)

查看jenkins本地文件中项目文件

![image-20220706225021748](https://file.iamwx.cn/images/202207062250810.png)

### 3.3 配置maven环境

maven项目打包需要有maven和jdk1.8环境：下载maven压缩包和jdk1.8的压缩包，解压到挂载文件夹下，`/home/jenkins/data`是我当前服务器中挂载的jenkins的文件夹

![image-20220706230744946](https://file.iamwx.cn/images/202207062307013.png)

修改maven的配置文件settings.xml

```xml
<!-- 阿里云镜像地址 -->
<mirror>  
    <id>alimaven</id>  
    <name>aliyun maven</name>  
    <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
    <mirrorOf>central</mirrorOf>          
</mirror>

<!-- JDK1.8编译插件 -->
<profile>
    <id>jdk-1.8</id>
    <activation>
        <activeByDefault>true</activeByDefault>
        <jdk>1.8</jdk>
    </activation>
    <properties>
        <maven.compiler.source>1.8</maven.compiler.source>
        <maven.compiler.target>1.8</maven.compiler.target>
        <maven.compiler.compilerVersion>1.8</maven.compiler.compilerVersion>
    </properties>        
</profile>
```

* jenkins配置JDK和maven

回到jenkins首页，`系统管理-全局工具配置`，配置完下图内容，点击应用、保存

![image-20220706231549450](https://file.iamwx.cn/images/202207062315534.png)

![image-20220706231628789](https://file.iamwx.cn/images/202207062316872.png)

### 3.4 打包项目

返回到jenkins首页，点击新增的`test-job`，点击配置

![image-20220706231850879](https://file.iamwx.cn/images/202207062318960.png)

配置当前项目构建操作：点击增加构建操作，选择调用顶层Maven目标，选择配置的maven，目标输入package，点击应用、保存

![image-20220706232136650](https://file.iamwx.cn/images/202207062321719.png)

构建项目：到底test-job首页后，点击立即构建，然后进入到控制台输出查看，首次会进行依赖下载，需要稍微等待一会儿

![image-20220706233720483](https://file.iamwx.cn/images/202207062337569.png)

出现BUILD SUCCESS后，查看本地项目内target文件夹下，jar包已经被正常打包出来

![image-20220706233832107](https://file.iamwx.cn/images/202207062338183.png)

### 3.5 jenkins容器使用宿主机Docker【后续需要使用】

构建镜像和发布镜像到镜像仓库都需要使用到docker命令，而在jenkins容器内部安装Docker官方推荐直接采用宿主机带的Docker即可。

设置jenkins容器使用宿主机Docker

- 设置宿主机docker.sock权限：

  ```sh
  sudo chown root:root /var/run/docker.sock
  sudo chmod o+rw /var/run/docker.sock
  ```

- 添加数据卷

在jenkins的docker-compose.yml文件中修改，修改后如下

```yaml
version: "3.1"
services:
  jenkins:
    image: jenkins/jenkins
    container_name: jenkins
    ports:
      - 8080:8080
      - 50000:50000
    volumes:
      - ./data/:/var/jenkins_home/
      - /usr/bin/docker:/usr/bin/docker
      - /var/run/docker.sock:/var/run/docker.sock
      - /etc/docker/daemon.json:/etc/docker/daemon.json
    restart: always
```



## 四、配置发布&远程操作

将打包好的jar包发布到测试或正式服务器，此时使用jenkins的Publish Over SSH插件

### 4.1 配置服务器

* 从首页点击系统管理-系统配置-然后滑到最底部

![image-20220714230318386](https://file.iamwx.cn/images/202207142303430.png)

* 如下图所示，点击新增按钮

![image-20220714230400674](https://file.iamwx.cn/images/202207142304716.png)

* 开始填写参数

![image-20211125210148202](https://file.iamwx.cn/images/202207142306722.png)

* 配置任务的构建后操作，进入创建的任务-配置-构建后操作

![image-20211125210424346](https://file.iamwx.cn/images/202207142309601.png)

![image-20220714231136526](https://file.iamwx.cn/images/202207142311581.png)

* 应用并保存后构建项目，查看日志

![image-20220714231307755](https://file.iamwx.cn/images/202207142313800.png)

* 查看目标服务器指定文件夹，可见文件以及传输完成

![image-20220714231350592](https://file.iamwx.cn/images/202207142313639.png)

### 4.2 通过打包成Jar包部署项目

#### 4.2.1 目标服务器运行环境准备

```shell
test-job
├── bak  # 备份jar包文件夹
├── catalina.out # 运行指定日志文件
├── jenkins-deploy-demo.jar # 需要运行的jar文件
└── new # 发布新的jar包时需要上传到此目录
    └── start.sh  # 运行项目脚本：会先杀掉旧进程
```

start.sh 内容如下

```shell
# !/bin/bash
cd ../
now=$(date "+%Y%m%d-%H%M%S")
echo "$(date)------- 开始关闭接口服务 --------"
server_pid=$(netstat -anp|grep 8099|awk '{printf $7}'|cut -d/ -f1)
echo "$(date)-pid: $server_pid"
if [ "$server_pid" == "" ]
  then
    echo "$(date)------- 成功关闭接口服务 --------"
 else
    echo "$(date)-TOMCAT PID: $server_pid"
    kill -9 "$server_pid"
    echo "$(date)------- 成功关闭接口服务 --------"
fi
# 备份
echo "$(date)------- 备份 jar 包 --------"
mv `pwd`/jenkins-deploy-demo.jar `pwd`/bak/jenkins-deploy-demo.jar.$(date "+%Y%m%d")

# 更新
echo "$(date)------- 更新 jar 包 --------"
mv `pwd`/new/jenkins-deploy-demo.jar `pwd`/jenkins-deploy-demo.jar

# 启动服务
echo "$(date)------- 启动接口服务 --------"

# 此处必须设置目标服务器java的绝对路径，否则会提示 nohup: 无法运行命令'java': 没有那个文件或目录
nohup /usr/lib/jdk1.8.0_321/bin/java -jar jenkins-deploy-demo.jar >>catalina.out 2>&1 &

echo "$(date)------- 接口服务成功 --------"
```

#### 4.2.2 修改jenkins上传文件配置

![image-20220715105241769](https://file.iamwx.cn/images/202207151052868.png)

#### 4.3.3 修改代码、提交、构建

增加新的接口后提交到gitlab

![image-20220715105422308](https://file.iamwx.cn/images/202207151054413.png)

在jenkins对应项目中，点击立即构建，等部署完成访问新的接口即可

![image-20220715105524077](https://file.iamwx.cn/images/202207151055168.png)

### 4.3 通过打包成Docker镜像部署项目

#### 4.3.1 创建Dockerfile、Docker-compose文件

在项目根目录创建docker文件夹

* 添加Dockerfile文件

![image-20220716002604818](https://file.iamwx.cn/images/202207160026878.png)

* 添加docker-compose.yml文件

![image-20220716005757089](https://file.iamwx.cn/images/202207160057143.png)

#### 4.3.2 修改jenkins任务配置

![image-20220717230957215](https://file.iamwx.cn/images/202207172309400.png)

#### 4.3.3 立即构建

构建日志

![image-20220717231030968](https://file.iamwx.cn/images/202207172310017.png)

前往目标服务器查看，docker容器已经在运行，请求接口正常

![image-20220717231113932](https://file.iamwx.cn/images/202207172311980.png)

![image-20220717231227970](https://file.iamwx.cn/images/202207172312042.png)

### 4.4 基于Git tag构建

#### 4.4.1 确保安装插件Git Parameter

![image-20220717231532769](https://file.iamwx.cn/images/202207172315838.png)

#### 4.4.2 设置任务参数化构建

![image-20220717231643267](https://file.iamwx.cn/images/202207172316332.png)

![image-20220718132622222](https://file.iamwx.cn/images/202207181326300.png)

#### 4.4.3 给项目添加tag版本

![image-20211126165639286](https://file.iamwx.cn/images/202207181328721.png)

#### 4.4.4 设置任务构建时采用Shell方式构建，拉取指定tag版本代码

将原来选择maven环境构建的删除掉，然后重新添加一个执行shell的构建操作

![](https://file.iamwx.cn/images/202207181338356.png)

shell命令内容以及描述

```shell
# 进入项目根目录
cd /var/jenkins_home/workspace/jenkins-deploy-demo
# 拉取指定分支代码，$release 中 release 是自定义的名称标识
git checkout $release
# 执行mvn clean install，因为是自己安装的maven，需要指定绝对路径
/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package
```

保存配置后发现立即构建变成了下图所示，点击后右侧出现版本选择，版本数据来源是Gitlab设置的tag

![image-20220718140908400](https://file.iamwx.cn/images/202207181409468.png)

在Gitlab上再新增一个tab v2.0.0，然后到jenkins刷新上图的页面，可见增加的tag v2.0.0 都已经显示

![image-20220718141024318](https://file.iamwx.cn/images/202207181410386.png)

#### 4.4.5 立即构建

选择版本后点击立即构建即可，然后访问接口测试项目启动是否正常

#### 4.4.6 新tag测试

修改代码接口，提交到Gitlab，并新增一个v3.0.0tag，在jenkins中选择v3.0.0立即构建，构建完成后访问接口测试

![image-20220718143052541](https://file.iamwx.cn/images/202207181430611.png)

## 五、jenkins流水线

### 5.1 流水线介绍

之前采用jenkins的自由风格构建的项目，每个步骤流程都要通过不同的方式设置，并且构建过程中整体流程是不可见的，无法确认每个流程花费的时间，并且问题不方便定位问题。

jenkins的Pipeline可以让项目的发布整体流程可视化，明确执行的阶段，可以快速的定位问题。并且整个项目的生命周期可以通过一个Jenkinsfile文件管理，而且Jenkinsfile文件是可以放在项目中维护。

所以Pipeline相对自由风格或者其他的项目风格更容易操作。

### 5.2 构建jenkins流水线任务

#### 5.2.1 创建任务

![image-20220718153443484](https://file.iamwx.cn/images/202207181534599.png)

![image-20220718153808963](https://file.iamwx.cn/images/202207181538080.png)

保存后点击立即构建

![image-20220718153847356](https://file.iamwx.cn/images/202207181538424.png)

#### 5.2.2 Groovy脚本

* Groovy脚本基础语法

```sh
// 所有脚本命令包含在pipeline{}中
pipeline {  
		// 指定任务在哪个节点执行（jenkins支持分布式）
    agent any
    
    // 配置全局环境，指定变量名=变量值信息
    environment{
    	host = '192.168.11.11'
    }

    // 存放所有任务的合集
    stages {
    		// 单个任务
        stage('任务1') {
        	// 实现任务的具体流程
            steps {
                echo 'do something'
            }
        }
				// 单个任务
        stage('任务2') {
        	// 实现任务的具体流程
            steps {
                echo 'do something'
            }
        }
        // ……
    }
}
```

* 测试实例

```sh
pipeline {
    agent any

    // 存放所有任务的合集
    stages {
        stage('拉取Git代码') {
            steps {
                echo '拉取Git代码'
            }
        }
        
        stage('构建代码') {
            steps {
                echo '构建代码'
            }
        }

        stage('制作自定义镜像并发布') {
            steps {
                echo '制作自定义镜像并发布'
            }
        }

        stage('部署工程') {
            steps {
                echo '部署工程'
            }
        }
    }
}
```

* 配置到jenkins中

![image-20220718154154048](https://file.iamwx.cn/images/202207181541123.png)

* 立即构建，查看效果

![image-20220718154415174](https://file.iamwx.cn/images/202207181544248.png)

#### 5.2.3 Jenkinsfile实现

Jenkinsfile方式需要将脚本内容编写到项目中的Jenkinsfile文件中，每次构建会自动拉取项目并且获取项目中Jenkinsfile文件对项目进行构建

* 配置pipeline如下并保存

![image-20220718160500599](https://file.iamwx.cn/images/202207181605790.png)

* 配置Jenkinsfile并提交到Gitlab

![image-20220718160758424](https://file.iamwx.cn/images/202207181607558.png)

* 立即构建

![image-20211202151225161](https://file.iamwx.cn/images/202207181611344.png)

### 5.3 jenkins流水线任务实现

> 备注：流水线语法生成

![image-20220718161941262](https://file.iamwx.cn/images/202207181619359.png)

![image-20220718162001957](https://file.iamwx.cn/images/202207181620045.png)

#### 5.3.1 参数化构建-指定tag构建

* 设置Git参数，名称后续会用到

![image-20220718222609374](https://file.iamwx.cn/images/202207182226555.png)

#### 5.3.2 拉取Git代码

通过流水线语法生成Checkout代码的脚本

![image-20220718164312197](https://file.iamwx.cn/images/202207181643331.png)

![image-20220718164357533](https://file.iamwx.cn/images/202207181643619.png)

复制生成的流水线脚本到项目中的Jenkinsfile中，并将*/master更改为标签**${tag}**，release是设置参数化构建过程的名称

替换后的内容

```sh
pipeline {
    agent any

    // 存放所有任务的合集
    stages {
        // 拉取git代码
        stage('拉取Git代码') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '${tag}']], extensions: [], userRemoteConfigs: [[credentialsId: 'gitlab_wx', url: 'https://gitlab.xxx.xxx/wangx/jenkins-deploy-demo.git']]])
            }
        }
        // 构建代码
        stage('构建代码') {
            steps {
                echo '构建代码'
            }
        }
        // 制作自定义镜像并发布
        stage('制作自定义镜像并发布') {
            steps {
                echo '制作自定义镜像并发布'
            }
        }
        // 部署工程
        stage('部署工程') {
            steps {
                echo '部署工程'
            }
        }
    }
}
```

#### 5.3.3 构建代码

将Jenkinsfile中构建代码代码块替换为如下内容

```sh
sh '/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package -DskipTests'
```

替换后的内容为

```sh
pipeline {
    agent any

    // 存放所有任务的合集
    stages {
        // 拉取git代码
        stage('拉取Git代码') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '${tag}']], extensions: [], userRemoteConfigs: [[credentialsId: 'gitlab_wx', url: 'https://gitlab.hanshang.site/wangx/jenkins-deploy-demo.git']]])
            }
        }
        // 构建代码
        stage('构建代码') {
            steps {
                sh '/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package -DskipTests'
            }
        }
        // 制作自定义镜像并发布
        stage('制作自定义镜像并发布') {
            steps {
                echo '制作自定义镜像并发布'
            }
        }
        // 部署工程
        stage('部署工程') {
            steps {
                echo '部署工程'
            }
        }
    }
}
```

#### 5.3.4 制作自定义镜像并发布到阿里云

> 在往下进行之前，需要先让jenkins容器内部能使用jenkins容器使用宿主机Docker，详见3.5

将Jenkinsfile中制作自定义镜像并发布代码块替换为如下内容，同时增加环境变量

```sh
sh '''cp ./target/*.jar ./docker/
cd ./docker
docker build -t ${JOB_NAME}:${tag} ./'''

sh '''docker login -u ${aliyunUser} -p ${aliyunPasswd} ${aliyunHost}
docker tag ${JOB_NAME}:${tag} ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}
docker push ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}'''
```

替换后的内容为

```sh
pipeline {
    agent any

    environment{
    		// 需要设置为自己的参数
        aliyunHost = 'xxxx'
        aliyunRepo = 'xxxx'
        aliyunUser = 'xxxx'
        aliyunPasswd = 'xxxx'
    }

    // 存放所有任务的合集
    stages {
        // 拉取git代码
        stage('拉取Git代码') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '${tag}']], extensions: [], userRemoteConfigs: [[credentialsId: 'gitlab_wx', url: 'https://gitlab.hanshang.site/wangx/jenkins-deploy-demo.git']]])
            }
        }
        // 构建代码
        stage('构建代码') {
            steps {
                sh '/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package -DskipTests'
            }
        }
        // 制作自定义镜像并发布
        stage('制作自定义镜像并发布') {
            steps {
                sh '''cp ./target/*.jar ./docker/
                cd ./docker
                docker build -t ${JOB_NAME}:${release} ./'''
                
                sh '''docker login -u ${aliyunUser} -p ${aliyunPasswd} ${aliyunHost}
                docker tag ${JOB_NAME}:${tag} ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}
                docker push ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}'''
            }
        }
        // 部署工程
        stage('部署工程') {
            steps {
                echo '部署工程'
            }
        }
    }
}
```

* 提交代码后，新增tag，在jenkins上选择对应tag进行构建

构建成功后可在本地docker查看镜像和到阿里云查看镜像是否上传成功

![image-20220718175639559](https://file.iamwx.cn/images/202207181756684.png)

![image-20220718175651768](https://file.iamwx.cn/images/202207181756833.png)

#### 5.3.5 远程发布

* 在目标服务器创建 deploy.sh 脚本文件，当前存储在 /home/admin/Downloads/jenkins-deploy-demo 文件夹下

```shell
aliyun_url=$1
aliyun_repo=$2
project_name=$3
tag=$4
port=$5

imageName=$aliyun_url/$aliyun_repo/$project_name:$tag

containerId=`docker ps -a | grep ${project_name} | awk '{print $1}'`
if [ "$containerId" != "" ] ; then
    docker stop $containerId
    docker rm $containerId
    echo "Delete Container Success"
fi

imageId=`docker images | grep ${project_name} | awk '{print $3}'`

if [ "$imageId" != "" ] ; then
    docker rmi -f $imageId
    echo "Delete Image Success"
fi

docker login -u 账号 -p 密码 $aliyun_url

docker pull $imageName

docker run -d -p $port:$port --name $project_name $imageName

echo "Start Container Success"
echo $project_name
```

设置文件为可执行文件

```shell
chmod a+x deploy.sh
```

* 通过流水线语法获取字符串

![image-20220718221838212](https://file.iamwx.cn/images/202207182218411.png)

```shell
# 远程服务器部署的脚本：aliyunHost、aliyunRepo 是在Jenkinsfile配置的，tag获取的git parameter，port配置详见下方第二张图片
deploy.sh $aliyunHost $aliyunRepo $JOB_NAME $tag $port
```



![image-20220718223233941](https://file.iamwx.cn/images/202207182232011.png)

补充了发布脚本后的内容

> 部署工程中execCommand值中即引用了Jenkinsfile的变量，也引用的jenkins的自定义参数，需用使用英文双引号包裹
>
> deloly.sh 需要使用绝对路径

```shell
pipeline {
    agent any

    environment{
        aliyunHost = 'registry.cn-hangzhou.aliyuncs.com'
        aliyunRepo = 'dtimages'
        aliyunUser = '浙江道霆信息技术有限公司'
        aliyunPasswd = 'MoveFast!'
    }

    // 存放所有任务的合集
    stages {
        // 拉取git代码
        stage('拉取Git代码') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '${tag}']], extensions: [], userRemoteConfigs: [[credentialsId: 'gitlab_wx', url: 'https://gitlab.hanshang.site/wangx/jenkins-deploy-demo.git']]])
            }
        }
        // 构建代码
        stage('构建代码') {
            steps {
                sh '/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package -DskipTests'
            }
        }
        // 制作自定义镜像并发布
        stage('制作自定义镜像并发布') {
            steps {
                sh '''cp ./target/*.jar ./docker/
                cd ./docker
                docker build -t ${JOB_NAME}:${tag} ./'''
                
                sh '''docker login -u ${aliyunUser} -p ${aliyunPasswd} ${aliyunHost}
                docker tag ${JOB_NAME}:${tag} ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}
                docker push ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}'''
            }
        }
        // 部署工程
        stage('部署工程') {
            steps {
                sshPublisher(publishers: [sshPublisherDesc(configName: '192.168.1.200', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: "/home/admin/Downloads/jenkins-deploy-demo/deploy.sh $aliyunHost $aliyunRepo $JOB_NAME $tag $port", execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: '', remoteDirectorySDF: false, removePrefix: '', sourceFiles: '')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
            }
        }
    }
}
```

> execCommand 需要使用双引号，否则执行命令无效，具体原因未知

* 配置port参数

![image-20220718223047645](https://file.iamwx.cn/images/202207182230766.png)

* 立即构建

在目标服务器上查看在运行的容器，可见已经发布成功

![image-20220718225012120](https://file.iamwx.cn/images/202207182250244.png)

## 六、发布到k8s

### 6.1 环境准备

k8s的安装：[点击查看](https://www.iamwx.cn/archives/k8s-kuboard)

### 6.2 文件准备

#### 6.2.1 在k8s master服务器上创建secret

```shell
# aliregistry：可替换为自己的secret名称；registry.cn-hangzhou.aliyuncs.com：阿里云的仓库地址，可替换为自己的私有的；
kubectl create secret docker-registry  --dry-run=client  aliregistry  --docker-server=registry.cn-hangzhou.aliyuncs.com --docker-username=你的账号 --docker-password=你的密码 --namespace=test-ns  -o yaml > docker-secret.yaml

# 执行完上述命令后，会在当前文件夹下创建 docker-secret.yaml 文件，查看内容，其中 dockerconfigjson 是地址、用户名、密码加密后的
cat docker-secret.yaml 
apiVersion: v1
data:
  .dockerconfigjson: eyJhdXRocyI6eyJyZWdpc3RyeS5jbi1oYW5nemhvdS5hbGl5dW5jcy5jb20iOnsidXNlcm5hbWUiOiLmtZnmsZ/pgZPpnIbkv6Hmga/mioDmnK/mnInpmZDlhazlj7giLCJwYXNzd29yZCI6Ik1vdmVGYXN0ISIsImF1dGgiOiI1cldaNXJHZjZZR1Q2WnlHNUwraDVvR3Y1b3FBNXB5djVweUo2Wm1RNVlXczVZKzRPazF2ZG1WR1lYTjBJUT09In19fQ==
kind: Secret
metadata:
  creationTimestamp: null
  name: aliregistry
  namespace: test-ns
type: kubernetes.io/dockerconfigjson

# 执行文件创建secret
kubectl apply -f docker-secret.yaml

# 查看secret
[root@k8smaster k8s]# kubectl get secret -n test-ns
NAME                  TYPE                                  DATA   AGE
aliregistry           kubernetes.io/dockerconfigjson        1      24m
default-token-f9r6q   kubernetes.io/service-account-token   3      17d
```

#### 6.2.2 创建pipeline.yml

```shell
apiVersion: apps/v1
kind: Deployment
metadata:
	# 指定命名空间
  namespace: test-ns
  # 指定工作负载名称
  name: jenkins-deploy-demo-pipeline
  labels:
    app: jenkins-deploy-demo-pipeline
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jenkins-deploy-demo-pipeline
  template:
    metadata:
      labels:
        app: jenkins-deploy-demo-pipeline    
    spec:
      containers:
      - name: jenkins-deploy-demo-pipeline
        image: registry.cn-hangzhou.aliyuncs.com/dtimages/jenkins-deploy-demo-pipeline:v5.0.0
        # 总是重新拉取镜像
        imagePullPolicy: Always
        ports:
        - containerPort: 8099
      # 指定只用自己创建的secret，如果是共有镜像，则不需要配置
      imagePullSecrets:
      - name: aliregistry
---
apiVersion: v1
kind: Service
metadata:
	# 指定命名空间
  namespace: test-ns
  labels:
  	# 指定服务名称
    app: jenkins-deploy-demo-pipeline
  name: jenkins-deploy-demo-pipeline  
spec:
  selector:
  	# 指定应用
    app: jenkins-deploy-demo-pipeline
  ports:
  # 对外端口
  - port: 8099
  	# 容器内端口
    targetPort: 8099
  type: NodePort
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
	# 指定命名空间
  namespace: test-ns
  # 指定 Ingress 名称
  name: jenkins-deploy-demo-pipeline
spec:
  ingressClassName: ingress
  rules:
  - host: pipeline.iamwx.cn
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: jenkins-deploy-demo-pipeline
            port:
              number: 8099
```

pipeline.yml 文件创建好后，在k8s中执行测试效果

```shell
kubectl apply -f pipeline.yml
# 查看服务端口
kubectl get service -n test-ns
NAME                           TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE
jenkins-deploy-demo-pipeline   NodePort   10.96.204.60   <none>        8099:30387/TCP   52m
```

使用 ip:30387/test 即可访问接口

![image-20220719104926993](https://file.iamwx.cn/images/202207191049075.png)

测试完成后，将pipeline.yml放入项目中（此时我讲tag改为5.0.0，方便测试发布效果）

![image-20220719105225579](https://file.iamwx.cn/images/202207191052637.png)

#### 6.2.3 配置k8s master服务器参数

![image-20220719105707126](https://file.iamwx.cn/images/202207191057173.png)

#### 6.2.3 修改Jenkinsfile

* 在jenkins流水线语法生成脚本

将项目中的pipeline.yml文件上传到目标服务器，在目标服务器准备了空文件夹 /home/k8s/deploy

![image-20220719105843385](https://file.iamwx.cn/images/202207191058448.png)

复制脚本到Jenkinsfile中

![image-20220719105856352](https://file.iamwx.cn/images/202207191058414.png)

当前Jenkinsfile内容

```sh
pipeline {
    agent any

    environment{
        aliyunHost = 'registry.cn-hangzhou.aliyuncs.com'
        aliyunRepo = 'xxx'
        aliyunUser = 'xxx'
        aliyunPasswd = 'xxx'
    }

    // 存放所有任务的合集
    stages {
        // 拉取git代码
        stage('拉取Git代码') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '${tag}']], extensions: [], userRemoteConfigs: [[credentialsId: 'gitlab_wx', url: 'https://gitlab.hanshang.site/wangx/jenkins-deploy-demo.git']]])
            }
        }
        // 构建代码
        stage('构建代码') {
            steps {
                sh '/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package -DskipTests'
            }
        }
        // 制作自定义镜像并发布
        stage('制作自定义镜像并发布') {
            steps {
                sh '''cp ./target/*.jar ./docker/
                cd ./docker
                docker build -t ${JOB_NAME}:${tag} ./'''
                
                sh '''docker login -u ${aliyunUser} -p ${aliyunPasswd} ${aliyunHost}
                docker tag ${JOB_NAME}:${tag} ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}
                docker image prune -f
                docker push ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}'''
            }
        }
        // 上传pipeline.yml文件
        stage('上传pipeline.yml文件') {
            steps {
                sshPublisher(publishers: [sshPublisherDesc(configName: 'k8s-master', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: '', execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: ' /home/k8s/deploy', remoteDirectorySDF: false, removePrefix: '', sourceFiles: 'pipeline.yml')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
            }
        }
    }
}
```

提交代码到Gitlab，可创建新的tag v4.0.1进行测试 

在Jenkins中选择最新的tag进行构建

![image-20220719111207298](https://file.iamwx.cn/images/202207191112370.png)

构建完成后，前往k8s master服务器的 /home/k8s/deploy 文件夹查看

![image-20220719111247663](https://file.iamwx.cn/images/202207191112727.png)

* 设置Jenkins无密码登录k8s-master

```shell
# 需要进入jenkins容器，然后运行之后的命令
docker exec -it jenkins bash
# 查看Jenkins中公钥信息
cd ~/.ssh
# 如果当期文件夹下无id_rsa / id_rsa.pub两个文件，则执行下面的命令生成，直接三次回撤即可
ssh-keygen -t rsa
# 查看生成的文件
ls
id_rsa  id_rsa.pub  known_hosts

# 打印公钥内容，复制内容
cat id_rsa.pub

# 进入到k8s master服务器，进入到 ~/.ssh/ 文件夹下，如果没有则手动创建
# 在 authorized_keys 文件（如果没有则手动创建 touch authorized_keys ）里追加jenkins服务器的公钥，需要换行追加，一个公钥占一行

# 验证免密操作
ssh root@192.168.1.100 123
bash: 123: 未找到命令
```

* 配置pipeline最后一步，远程执行kubectl命令

在Jenkinsfile中增加远程执行kubectl命令过程，修改后的内容

```shell
pipeline {
    agent any

    environment{
        aliyunHost = 'registry.cn-hangzhou.aliyuncs.com'
        aliyunRepo = 'xxx'
        aliyunUser = 'xxx'
        aliyunPasswd = 'xxx'
    }

    // 存放所有任务的合集
    stages {
        // 拉取git代码
        stage('拉取Git代码') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '${tag}']], extensions: [], userRemoteConfigs: [[credentialsId: 'gitlab_wx', url: 'https://gitlab.hanshang.site/wangx/jenkins-deploy-demo.git']]])
            }
        }
        // 构建代码
        stage('构建代码') {
            steps {
                sh '/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package -DskipTests'
            }
        }
        // 制作自定义镜像并发布
        stage('制作自定义镜像并发布') {
            steps {
                sh '''cp ./target/*.jar ./docker/
                cd ./docker
                docker build -t ${JOB_NAME}:${tag} ./'''
                
                sh '''docker login -u ${aliyunUser} -p ${aliyunPasswd} ${aliyunHost}
                docker tag ${JOB_NAME}:${tag} ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}
                docker image prune -f
                docker push ${aliyunHost}/${aliyunRepo}/${JOB_NAME}:${tag}'''
            }
        }
        // 上传pipeline.yml文件
        stage('上传pipeline.yml文件') {
            steps {
                sshPublisher(publishers: [sshPublisherDesc(configName: 'k8s-master', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: '', execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: ' /home/k8s/deploy', remoteDirectorySDF: false, removePrefix: '', sourceFiles: 'pipeline.yml')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
            }
        }
        // 远程执行kubectl命令
        stage('远程执行kubectl命令') {
            steps {
                sh 'ssh root@192.168.1.100 kubectl apply -f /home/k8s/deploy/pipeline.yml'
            }
        }
    }
}
```

提交代码到Gitlab，新增一个tag v5.0.0，在jenkins选择v5.0.0版本进行构建

构建完成后，通过Kuboard控制台查看或通过指令查看 ，如果应用运行成功，访问接口

> 期间自行测试过程中通过 kubectl delete -f xxx.yml ，再运行后服务对外的端口会改变，需查看最新端口用于访问接口