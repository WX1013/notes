# 使用Jenkins发布、回滚Docker的Job

## 一、准备

* Jenkins安装：[点击查看](https://www.iamwx.cn/archives/docker-jenkins)
  * 需要安装好Publish Over SSH和Active Choices插件

* 项目准备：创建一个简单的SpringBoot工程
  * 编写一个测试接口，在本地确认能访问通
  * 在根目录创建docker/Dockerfile

```yaml
FROM openjdk:8-jre
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone
COPY *.jar /app.jar
CMD java -jar app.jar
```

## 二、配置

### 1、创建并配置配置Jenkins的job

#### 1.1 创建一个流水线的job

![image-20220727145549954](https://file.iamwx.cn/images/202207271455999.png)

#### 1.2 配置参数化构建

##### 1.2.1 设置流水线配置

![image-20220727150958254](https://file.iamwx.cn/images/202207271509288.png)

##### 1.2.2 添加发布方式参数

![image-20220727145712188](https://file.iamwx.cn/images/202207271457212.png)

填写参数

![image-20220727145958041](https://file.iamwx.cn/images/202207271459068.png)

Groovy Script 内容

```shell
return [
  "Deploy",
  "Rollback"
]
```

##### 1.2.3 添加发布版本号参数

![image-20220727150107314](https://file.iamwx.cn/images/202207271501339.png)

填写参数

![image-20220727150143095](https://file.iamwx.cn/images/202207271501134.png)

##### 1.2.4 添加回滚版本号参数

![image-20220727150249122](https://file.iamwx.cn/images/202207271502151.png)

![image-20220727150623353](https://file.iamwx.cn/images/202207271506376.png)

Groovy Script 内容

```shell
# 指定当前job的备份文件夹 /var/jenkins_home/version_backup/first-gitlab-project-pipeline
path="/var/jenkins_home/version_backup/first-gitlab-project-pipeline"
tags=['bash','-c',"ls -t1 ${path}"].execute().text.readLines()
 
if (Status.equals("Rollback")) {
  return tags
} 
```

下方还有个参数需要填写

![image-20220727150727834](https://file.iamwx.cn/images/202207271507861.png)

以上三个参数设置完成后进行应用并保存

### 2、部署脚本准备

在项目根目录创建deploy.sh，并根据以下内容根据自己的情况进行补充脚本和参数

```shell
aliyun_url=$1
aliyun_repo=$2
aliyun_username=$3
aliyun_passwd=$4
project_name=$5
tag=$6
port=$7

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

docker image prune -f

docker login -u $aliyun_username -p $aliyun_passwd $aliyun_url

docker pull $imageName

docker run -d -p $port:$port --name $project_name $imageName

echo "Start Container Success"
echo $project_name
```

### 3、Jenkinsfile准备

在项目根目录创建Jenkinsfile，并根据以下内容根据自己的情况进行补充脚本和参数

> 此文件中各步骤都需要使用自己的参数，

```shell
pipeline {
    agent any

    environment{
        aliyunHost = '阿里云镜像仓库地址'
        aliyunRepo = '阿里云镜像仓库命名空间'
        aliyunUser = '账号'
        aliyunPasswd = '密码'
        // 打包的容器的名称（项目名）
        projectName = '项目名称'
        // 容器内外的端口
        port = '8099'
    }

    // 存放所有任务的合集
    stages {
        // 拉取git代码
        stage('拉取Git代码') {
            steps {
                script {
                    if(params.Status.equals("Deploy")){
                    		// 需要修改为自己的
                        checkout([$class: 'GitSCM', branches: [[name: '*/master']], extensions: [], userRemoteConfigs: [[credentialsId: 'wx-gitlab', url: '']]])
                    }
                    if(params.Status.equals("Rollback")){
                        echo "Rollback: jump checkout"
                    }
                }
            }
        }
        // 构建代码
        stage('构建代码') {
            steps {
                script {
                    if(params.Status.equals("Deploy")){
                   			// 此处完成maven项目打包，和创建以当前版本号为名称的文件夹
                        sh '''/var/jenkins_home/apache-maven-3.6.3/bin/mvn clean package
                        echo "mkdir -p /var/jenkins_home/${JOB_NAME}/${version}"
                        mkdir -p /var/jenkins_home/version_backup/${JOB_NAME}/${version}'''
                    }
                    if(params.Status.equals("Rollback")){
                        echo "Rollback: jump package"
                    }
                }
            }
        }
        // 制作自定义镜像并发布
        stage('制作自定义镜像并发布') {
            steps {
                script {
                    if(params.Status.equals("Deploy")){
                    		// 此处完成docker镜像打包并上传到阿里云镜像仓库
                        sh '''cp ./target/*.jar ./docker/
                        cd ./docker
                        docker build -t ${projectName}:${version} ./'''

                        sh '''docker login -u ${aliyunUser} -p ${aliyunPasswd} ${aliyunHost}
                        docker tag ${projectName}:${version} ${aliyunHost}/${aliyunRepo}/${projectName}:${version}
                        docker image prune -f
                        docker push ${aliyunHost}/${aliyunRepo}/${projectName}:${version}'''
                    }
                    if(params.Status.equals("Rollback")){
                        echo "Rollback: jump build docker image"
                    }
                }
            }
        }
        // 上传远程部署脚本 + 执行部署脚本
        stage('上传远程部署脚本 + 执行部署脚本') {
            steps {
                script {
                    if(params.Status.equals("Deploy")){
                    		// 此处使用 version 参数进行部署，需要使用流水线语法生成自己的命令，execCommand后使用的部署脚本命令需要使用双引号包裹，具体原因未知
                        sshPublisher(publishers: [sshPublisherDesc(configName: 'test-ssh-1.83', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: "sh /home/wangx/Downloads/deploy-rollback-pipeline/pipeline/deploy.sh ${aliyunHost} ${aliyunRepo} ${aliyunUser} ${aliyunPasswd} ${projectName} ${version} ${port}", execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: '/home/wangx/Downloads/deploy-rollback-pipeline/pipeline', remoteDirectorySDF: false, removePrefix: '', sourceFiles: 'deploy.sh')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
                    }
                    if(params.Status.equals("Rollback")){
                    		// 此处使用 RollbackVersion 进行回滚，execCommand后使用的部署脚本命令需要使用双引号包裹，具体原因未知
                        sshPublisher(publishers: [sshPublisherDesc(configName: 'test-ssh-1.83', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: "sh /home/wangx/Downloads/first-gitlab-project/pipeline/deploy.sh ${aliyunHost} ${aliyunRepo} ${aliyunUser} ${aliyunPasswd} ${projectName} ${RollbackVersion} ${port}", execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: '/home/wangx/Downloads/first-gitlab-project/pipeline', remoteDirectorySDF: false, removePrefix: '', sourceFiles: 'deploy.sh')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
                    }
                }
            }
        }
        // 清理工作空间
        stage('Clean') {
            steps {
              cleanWs(
                  cleanWhenAborted: true,
                  cleanWhenFailure: true,
                  cleanWhenNotBuilt: true,
                  cleanWhenSuccess: true,
                  cleanWhenUnstable: true,
                  cleanupMatrixParent: true,
                  // 这个选项是关闭延时删除，立即删除
                  disableDeferredWipeout: true,
                  deleteDirs: true
              )
            }
        }
    }
}
```

### 4、使用

#### 4.1 发布项目

![image-20220727152251364](https://file.iamwx.cn/images/202207271522416.png)

#### 4.2 回滚项目

![image-20220727152510506](https://file.iamwx.cn/images/202207271525552.png)



>以上内容如有疑问，请评论提问~